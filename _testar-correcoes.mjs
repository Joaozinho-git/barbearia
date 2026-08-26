// Banco de prova das correcoes candidatas para o vazamento horizontal.
//
//   npx next build && npx next start -p 3222
//   node _testar-correcoes.mjs
//
// Cada candidata entra como <style> injetado ANTES da primeira renderizacao
// (addScriptToEvaluateOnNewDocument), entao o que se mede e o layout de
// verdade, nao um reflow tardio.
//
// Criterios de aprovacao, todos ao mesmo tempo, em mobile:true:
//   scrollWidth ....... 412  (era 892)
//   innerWidth ........ 412  (era 892)  -> viewport de layout normalizada
//   idx-nav left ...... 16px (era 136px)
//   idx-nav y ......... dentro da tela (era 828, fora dos 823)
//   excedente vertical  279.2 preservado (arco inferior do glow azul)
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9356;
const URL = process.env.URL_MEDICAO ?? "http://localhost:3222/";
const SAIDA = "_medicao-correcoes.txt";

const CANDIDATAS = [
  ["A. baseline (sem patch)", ""],
  ["B. html{overflow-x:clip}", "html{overflow-x:clip}"],
  ["C. html{overflow-x:hidden}", "html{overflow-x:hidden}"],
  ["D. body{overflow-x:clip}", "body{overflow-x:clip}"],
  ["E. main{overflow-x:clip} (sem media)", "main{overflow-x:clip}"],
  [
    "F. @media(max-width:652px){main{overflow-x:clip}}",
    "@media (max-width:652px){main{overflow-x:clip}}",
  ],
  [
    "G. @media(max-width:652px){main{overflow-x:hidden}}",
    "@media (max-width:652px){main{overflow-x:hidden}}",
  ],
  [
    "H. main{overflow-x:clip;overflow-clip-margin:480px}",
    "main{overflow-x:clip;overflow-clip-margin:480px}",
  ],
];

const linhas = [];
const log = (s = "") => linhas.push(s);

const perfil = mkdtempSync(join(tmpdir(), "cdp-fix-"));
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

const PRAZO_MS = 30000;
const cdp = (method, params = {}, prazoMs = PRAZO_MS) =>
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
await cdp("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});

const SONDA = `(() => {
  const de = document.documentElement;
  const nav = document.querySelector('.idx-nav');
  const r = nav ? nav.getBoundingClientRect() : null;
  const corpo = document.body.getBoundingClientRect();
  return {
    iw: window.innerWidth,
    ih: window.innerHeight,
    cw: de.clientWidth,
    sw: de.scrollWidth,
    sh: de.scrollHeight,
    bodyH: +corpo.height.toFixed(1),
    verticalSobrando: +(de.scrollHeight - corpo.height).toFixed(1),
    idxLeft: nav ? getComputedStyle(nav).left : null,
    idxX: r ? +r.x.toFixed(1) : null,
    idxY: r ? +r.y.toFixed(1) : null,
    mq652: matchMedia('(max-width:652px)').matches,
    ovxHtml: getComputedStyle(de).overflowX,
    ovyHtml: getComputedStyle(de).overflowY,
    ovxBody: getComputedStyle(document.body).overflowX,
    ovyBody: getComputedStyle(document.body).overflowY,
  };
})()`;

let scriptAtual = null;

async function aplicar(css) {
  if (scriptAtual) {
    await cdp("Page.removeScriptToEvaluateOnNewDocument", {
      identifier: scriptAtual,
    });
    scriptAtual = null;
  }
  if (!css) return;
  const fonte = `document.addEventListener('DOMContentLoaded',function(){
    var s=document.createElement('style');
    s.id='patch-teste';
    s.textContent=${JSON.stringify(css)};
    document.head.appendChild(s);
  });
  (function(){
    var s=document.createElement('style');
    s.id='patch-teste-cedo';
    s.textContent=${JSON.stringify(css)};
    (document.head||document.documentElement).appendChild(s);
  })();`;
  const r = await cdp("Page.addScriptToEvaluateOnNewDocument", { source: fonte });
  scriptAtual = r.identifier;
}

async function medir(width, height, mobile) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
  await cdp("Page.navigate", { url: URL });
  await espera(1400);
  return js(SONDA);
}

const fmt = (d) =>
  `iw=${d.iw}x${d.ih} cw=${d.cw} sw=${d.sw} | idxLeft=${d.idxLeft} idxX=${d.idxX} idxY=${d.idxY} | vert=${d.verticalSobrando} | mq652=${d.mq652} | html=${d.ovxHtml}/${d.ovyHtml} body=${d.ovxBody}/${d.ovyBody}`;

for (const [nome, css] of CANDIDATAS) {
  await aplicar(css);
  const m = await medir(412, 823, true);
  const t = await medir(768, 1024, true);
  const d = await medir(412, 823, false);
  const passa =
    m.sw === 412 && m.iw === 412 && m.idxLeft === "16px" && m.idxY < 823 &&
    m.verticalSobrando < 2;
  log(`---- ${nome}`);
  log(`   412 mobile:true   ${fmt(m)}`);
  log(`   768 mobile:true   ${fmt(t)}`);
  log(`   412 mobile:false  ${fmt(d)}`);
  log(`   VEREDITO: ${passa ? "PASSA" : "reprova"}`);
  log();
}

// Desktop: a correcao nao pode cortar o sangramento das glows onde a viewport
// e mais larga que o main (652px). Mede o scrollWidth em 1280 nas candidatas
// que mexem no main.
log(`---- desktop 1280px (o main tem 652px; glows sangram para fora dele)`);
for (const [nome, css] of CANDIDATAS) {
  await aplicar(css);
  const d = await medir(1280, 900, false);
  log(`   ${nome.padEnd(46)} sw=${d.sw} vert=${d.verticalSobrando}`);
}

writeFileSync(SAIDA, linhas.join("\n") + "\n");
console.log(linhas.join("\n"));

ws.close();
chrome.kill();
try {
  rmSync(perfil, { recursive: true, force: true });
} catch {}
process.exit(0);
