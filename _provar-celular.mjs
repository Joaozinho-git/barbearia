// Captura a tela do CELULAR (mobile:true, 412x823) nos dois estados:
//   antes.png  = com o vazamento reintroduzido pelo shim  (o bug relatado)
//   depois.png = como o site esta agora
// Mesmo servidor, mesma execucao — a unica variavel e o vazamento.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9357;
const URL = process.env.URL_MEDICAO ?? "http://localhost:3222/";

const SHIM = `body::after{content:"";position:absolute;left:891px;top:0;width:1px;height:1px}`;

const perfil = mkdtempSync(join(tmpdir(), "cdp-cel-"));
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${perfil}`,
    "--no-first-run",
    "--disable-gpu",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function alvo() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const l = await r.json();
      const p = l.find((t) => t.type === "page");
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch {}
    await espera(250);
  }
  throw new Error("Chrome nao subiu");
}

const ws = new WebSocket(await alvo());
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pendentes = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pendentes.has(m.id)) {
    const { res, rej, prazo } = pendentes.get(m.id);
    pendentes.delete(m.id);
    clearTimeout(prazo);
    if (m.error) rej(new Error(JSON.stringify(m.error)));
    else res(m.result);
  }
};

const cdp = (method, params = {}, prazoMs = 30000) =>
  new Promise((res, rej) => {
    const i = ++id;
    const prazo = setTimeout(() => {
      pendentes.delete(i);
      rej(new Error(`CDP sem resposta em ${prazoMs}ms: ${method}`));
    }, prazoMs);
    pendentes.set(i, { res, rej, prazo });
    ws.send(JSON.stringify({ id: i, method, params }));
  });

const js = async (expr) => {
  const r = await cdp("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

await cdp("Page.enable");
await cdp("Runtime.enable");

let scriptShim = null;

async function capturar(nome, comShim) {
  if (scriptShim) {
    await cdp("Page.removeScriptToEvaluateOnNewDocument", { identifier: scriptShim });
    scriptShim = null;
  }
  if (comShim) {
    const r = await cdp("Page.addScriptToEvaluateOnNewDocument", {
      source: `function porShim(){var s=document.createElement('style');s.textContent=${JSON.stringify(SHIM)};(document.head||document.documentElement).appendChild(s)}
try{porShim()}catch(e){}
document.addEventListener('DOMContentLoaded',function(){try{porShim()}catch(e){}});`,
    });
    scriptShim = r.identifier;
  }

  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 412,
    height: 823,
    deviceScaleFactor: 2,
    mobile: true,
    screenWidth: 412,
    screenHeight: 823,
  });
  await cdp("Page.navigate", { url: URL });
  await espera(1800);

  // Rola ate a secao 02, que e onde as capturas do usuario mostram o indice
  // pousado em cima do texto.
  await js(`document.getElementById('s2').scrollIntoView({block:'start'});true`);
  await espera(1200);

  const estado = await js(`({
    iw: innerWidth, ih: innerHeight,
    sw: document.documentElement.scrollWidth,
    idx: getComputedStyle(document.querySelector('.idx-nav')).left,
    idxY: +document.querySelector('.idx-nav').getBoundingClientRect().y.toFixed(1)
  })`);

  const shot = await cdp("Page.captureScreenshot", { format: "png" });
  writeFileSync(nome, Buffer.from(shot.data, "base64"));
  console.log(
    `${nome.padEnd(22)} viewport=${estado.iw}x${estado.ih} scrollWidth=${estado.sw} idx.left=${estado.idx} idx.y=${estado.idxY}`,
  );
}

await capturar("_celular-antes.png", true);
await capturar("_celular-depois.png", false);

ws.close();
chrome.kill();
try {
  rmSync(perfil, { recursive: true, force: true });
} catch {}
process.exit(0);
