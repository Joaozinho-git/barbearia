// Diagnostico do vazamento horizontal e da posicao do indice lateral.
//
//   npx next build && npx next start -p 3222
//   node _medir-viewport.mjs
//
// Mede nos DOIS modos de emulacao. O modo que importa e mobile:true — e o que
// reproduz o aparelho real, e e justamente o que o _comparar-visual.mjs evita.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9355;
const URL = process.env.URL_MEDICAO ?? "http://localhost:3222/";
const SAIDA = process.env.SAIDA_MEDICAO ?? "_medicao-viewport.txt";

const linhas = [];
const log = (s = "") => linhas.push(s);

const perfil = mkdtempSync(join(tmpdir(), "cdp-vp-"));
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
// Por padrao mede com reduced-motion (sem motion-ok, .reveal ja visivel). Com
// COM_MOVIMENTO=1 mede o caminho normal, com as animacoes de reveal ativas.
if (!process.env.COM_MOVIMENTO) {
  await cdp("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
}

// Trava de ambiente.
{
  let html = "";
  try {
    html = await (await fetch(URL)).text();
  } catch {
    console.error(`Nada respondendo em ${URL}. Suba producao: npx next start -p 3222`);
    process.exit(1);
  }
  if (html.includes("next-devtools") || html.includes("__nextjs_original")) {
    console.error(`${URL} e servidor de DESENVOLVIMENTO. Meca contra producao.`);
    process.exit(1);
  }
  const meta = html.match(/<meta name="viewport"[^>]*>/);
  log(`meta viewport servido: ${meta ? meta[0] : "AUSENTE"}`);
  log();
}

async function abrir(width, height, mobile) {
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
}

// Rodape do documento: o excedente vertical da glow-blue precisa sobreviver a
// qualquer correcao. Medimos a distancia entre o fim do body e o fim da area
// rolavel — se ela sumir, a correcao cortou o arco inferior do glow azul.
const SONDA = `(() => {
  const de = document.documentElement;
  const nav = document.querySelector('.idx-nav');
  const r = nav ? nav.getBoundingClientRect() : null;
  const corpo = document.body.getBoundingClientRect();
  const vazando = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.checkVisibility || !el.checkVisibility()) continue;
    const b = el.getBoundingClientRect();
    if (b.right > de.clientWidth + 0.5 && b.width > 0) {
      vazando.push(el.tagName + '.' + (el.className.baseVal ?? el.className ?? '').toString().split(' ').slice(0,3).join('.') + ' right=' + b.right.toFixed(1));
    }
  }
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    vvWidth: visualViewport ? Math.round(visualViewport.width) : null,
    vvScale: visualViewport ? +visualViewport.scale.toFixed(3) : null,
    docClientWidth: de.clientWidth,
    docScrollWidth: de.scrollWidth,
    docScrollHeight: de.scrollHeight,
    bodyHeight: +corpo.height.toFixed(1),
    excedenteAbaixoDoBody: +(de.scrollHeight - corpo.height).toFixed(1),
    idxLeftComputado: nav ? getComputedStyle(nav).left : null,
    idxRect: r ? { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) } : null,
    idxPosicao: nav ? getComputedStyle(nav).position : null,
    vazandoDireita: vazando.slice(0, 12),
  };
})()`;

for (const mobile of [true, false]) {
  await abrir(412, 823, mobile);
  const d = await js(SONDA);
  log(`================ mobile:${mobile}  (device 412x823 @2x) ================`);
  log(`  innerWidth/innerHeight ....... ${d.innerWidth} x ${d.innerHeight}`);
  log(`  visualViewport width/scale ... ${d.vvWidth} / ${d.vvScale}`);
  log(`  documentElement.clientWidth .. ${d.docClientWidth}`);
  log(`  documentElement.scrollWidth .. ${d.docScrollWidth}   <-- vazamento`);
  log(`  body height .................. ${d.bodyHeight}`);
  log(`  scrollHeight - body .......... ${d.excedenteAbaixoDoBody}  <-- arco do glow azul`);
  log(`  .idx-nav position ............ ${d.idxPosicao}`);
  log(`  .idx-nav left (computado) .... ${d.idxLeftComputado}`);
  log(`  .idx-nav rect ................ ${JSON.stringify(d.idxRect)}`);
  log(`  elementos passando da direita:`);
  for (const v of d.vazandoDireita) log(`      ${v}`);
  log();
}

// Confirmacao do culpado: desliga so a .glow-white::before e remede.
await abrir(412, 823, true);
const antes = await js(`document.documentElement.scrollWidth`);
await js(
  `(() => { const s = document.createElement('style');
     s.textContent = '.glow-white::before{display:none!important}';
     document.head.appendChild(s); return true; })()`,
);
await espera(300);
const depois = await js(`document.documentElement.scrollWidth`);
log(`================ isolamento do culpado (mobile:true) ================`);
log(`  scrollWidth com .glow-white::before ......... ${antes}`);
log(`  scrollWidth SEM .glow-white::before ......... ${depois}`);
log(`  (se cair para ${412}, a .glow-white::before e a unica fonte)`);

writeFileSync(SAIDA, linhas.join("\n") + "\n");
console.log(linhas.join("\n"));

ws.close();
chrome.kill();
try {
  rmSync(perfil, { recursive: true, force: true });
} catch {}
process.exit(0);
