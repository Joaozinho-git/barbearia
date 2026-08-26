// Simula candidatas de mecanica do indice contra a GEOMETRIA REAL da pagina,
// lida do navegador em varias viewports. Nada aqui e chute: as alturas de
// secao vem do layout de producao.
//
//   npx next build && npx next start -p 3222
//   node _simular-indice.mjs
//
// Criterios que uma mecanica precisa cumprir, TODOS ao mesmo tempo:
//   A. no topo da pagina (scrollY 0) o ponto aceso e o 00
//   B. no fim da pagina o ponto aceso e o 04
//   C. clicar no ponto N deixa o ponto N aceso quando a rolagem terminar
//   D. o ponto nunca anda para tras enquanto se rola para baixo
//   E. todo ponto acende em algum trecho da rolagem
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9360;
const URL = process.env.URL_MEDICAO ?? "http://localhost:3222/";
const MARGEM_ANCORA = 24; // section[id] { scroll-margin-top: 24px }

const VIEWPORTS = [
  [320, 640], [320, 700], [360, 740], [375, 667], [390, 844],
  [412, 823], [412, 915], [414, 896], [430, 932], [430, 1000],
];

const perfil = mkdtempSync(join(tmpdir(), "cdp-sim-"));
const chrome = spawn(
  CHROME,
  ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${perfil}`,
   "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"],
  { stdio: "ignore" },
);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function alvo() {
  for (let i = 0; i < 60; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
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
const pend = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) {
    const { res, rej, prazo } = pend.get(m.id);
    pend.delete(m.id); clearTimeout(prazo);
    if (m.error) rej(new Error(JSON.stringify(m.error))); else res(m.result);
  }
};
const cdp = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    const prazo = setTimeout(() => { pend.delete(i); rej(new Error("timeout " + method)); }, 30000);
    pend.set(i, { res, rej, prazo });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const js = async (expr) => {
  const r = await cdp("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

await cdp("Page.enable");
await cdp("Runtime.enable");

// ------------------------------------------------------------ candidatas ---
// Cada uma devolve o indice (0..4) da secao ativa.
const ultimaAbaixo = (topos, linha) => {
  let a = 0;
  for (let i = 0; i < topos.length; i++) if (topos[i] <= linha) a = i;
  return a;
};

const desliza = (base, janelaFrac) => (g, y) => {
  if (g.maxY <= 0) return 0;
  const janela = g.vh * janelaFrac;
  const restante = g.maxY - y;
  const empurrao = Math.min(1, Math.max(0, (janela - restante) / janela));
  return ultimaAbaixo(g.topos, y + g.vh * (base + (1 - base) * empurrao));
};

const CANDIDATAS = {};
if (process.env.VARRER) {
  for (const base of [0.25, 0.28, 0.3, 0.32, 0.35, 0.38]) {
    for (const jan of [0.08, 0.1, 0.12, 0.14]) {
      CANDIDATAS[`base ${base} janela ${jan}`] = desliza(base, jan);
    }
  }
}
Object.assign(CANDIDATAS, {
  "linha fixa 35%": (g, y) => ultimaAbaixo(g.topos, y + g.vh * 0.35),
  "linha fixa 50%": (g, y) => ultimaAbaixo(g.topos, y + g.vh * 0.5),
  "faixa central (atual)": (g, y) => {
    // Reproduz o IntersectionObserver de hoje: primeira secao que cruza a
    // faixa de 45% a 55% da tela.
    const topo = y + g.vh * 0.45, base = y + g.vh * 0.55;
    for (let i = 0; i < g.topos.length; i++) {
      const t = g.topos[i], b = t + g.alturas[i];
      if (b > topo && t < base) return i;
    }
    return 0;
  },
  "maior area visivel": (g, y) => {
    let melhor = 0, area = -1;
    for (let i = 0; i < g.topos.length; i++) {
      const t = g.topos[i], b = t + g.alturas[i];
      const vis = Math.max(0, Math.min(b, y + g.vh) - Math.max(t, y));
      if (vis > area) { area = vis; melhor = i; }
    }
    return melhor;
  },
  "proporcional (y/maxY)": (g, y) =>
    ultimaAbaixo(g.topos, g.maxY > 0 ? (y / g.maxY) * g.docH : 0),
  "linha deslizante 35%->100%, janela 25%": (g, y) => {
    if (g.maxY <= 0) return 0;
    const janela = g.vh * 0.25;
    const restante = g.maxY - y;
    const empurrao = Math.min(1, Math.max(0, (janela - restante) / janela));
    const fracao = 0.35 + 0.65 * empurrao;
    return ultimaAbaixo(g.topos, y + g.vh * fracao);
  },
  "linha deslizante 30%->100%, janela 30%": (g, y) => {
    if (g.maxY <= 0) return 0;
    const janela = g.vh * 0.3;
    const restante = g.maxY - y;
    const empurrao = Math.min(1, Math.max(0, (janela - restante) / janela));
    const fracao = 0.3 + 0.7 * empurrao;
    return ultimaAbaixo(g.topos, y + g.vh * fracao);
  },
});

const resultados = {};
for (const nome of Object.keys(CANDIDATAS)) resultados[nome] = { falhas: [], acesos: [] };

for (const [w, h] of VIEWPORTS) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: w, height: h, deviceScaleFactor: 2, mobile: true, screenWidth: w, screenHeight: h,
  });
  await cdp("Page.navigate", { url: URL });
  await espera(1500);
  const g = await js(`(() => {
    const de = document.documentElement;
    const topos = [], alturas = [];
    for (const s of ['s0','s1','s2','s3','s4']) {
      const el = document.getElementById(s);
      topos.push(el.offsetTop); alturas.push(el.offsetHeight);
    }
    return { vh: de.clientHeight, docH: de.scrollHeight, topos, alturas };
  })()`);
  g.maxY = g.docH - g.vh;

  for (const [nome, fn] of Object.entries(CANDIDATAS)) {
    const r = resultados[nome];
    const rot = `${w}x${h}`;

    // A. topo
    if (fn(g, 0) !== 0) r.falhas.push(`${rot} A: no topo acende ${fn(g, 0)}, esperado 00`);
    // B. fim
    if (fn(g, g.maxY) !== 4) r.falhas.push(`${rot} B: no fim acende ${fn(g, g.maxY)}, esperado 04`);
    // C. cliques
    for (let i = 0; i < 5; i++) {
      const destino = Math.max(0, Math.min(g.maxY, g.topos[i] - MARGEM_ANCORA));
      const got = fn(g, destino);
      if (got !== i) r.falhas.push(`${rot} C: clique em 0${i} acende 0${got}`);
    }
    // D. monotonia  +  E. cobertura
    let ant = -1;
    const vistos = new Set();
    for (let y = 0; y <= g.maxY; y += 4) {
      const a = fn(g, y);
      vistos.add(a);
      if (a < ant) { r.falhas.push(`${rot} D: anda para tras em y=${y} (${ant}->${a})`); break; }
      ant = a;
    }
    for (let i = 0; i < 5; i++) if (!vistos.has(i)) r.falhas.push(`${rot} E: 0${i} nunca acende`);

    // Fracao da rolagem em que cada ponto fica aceso, e divergencia contra a
    // secao que de fato ocupa mais tela (metrica de "parece certo"), medida
    // so fora do primeiro meio-ecra, onde dominancia e um criterio ruim.
    const conta = [0, 0, 0, 0, 0];
    let n = 0, diverge = 0, nDiv = 0;
    for (let y = 0; y <= g.maxY; y += 4) {
      const a = fn(g, y);
      conta[a]++; n++;
      let dom = 0, area = -1;
      for (let i = 0; i < 5; i++) {
        const t = g.topos[i], b = t + g.alturas[i];
        const vis = Math.max(0, Math.min(b, y + g.vh) - Math.max(t, y));
        if (vis > area) { area = vis; dom = i; }
      }
      if (y > g.vh * 0.5) { nDiv++; if (a !== dom) diverge++; }
    }
    r.acesos.push(`${rot}: ` + conta.map((c) => Math.round((c / n) * 100) + "%").join(" ") +
      `   diverge ${Math.round(diverge / Math.max(1, nDiv) * 100)}%`);
  }
}

for (const [nome, r] of Object.entries(resultados)) {
  const ok = r.falhas.length === 0;
  console.log(`${ok ? "PASSA " : "FALHA "} ${nome}   (${r.falhas.length} falhas)`);
  for (const f of r.falhas.slice(0, 6)) console.log(`         ${f}`);
  if (r.falhas.length > 6) console.log(`         ... e mais ${r.falhas.length - 6}`);
  if (ok) console.log(`         tempo aceso por ponto (00 01 02 03 04):\n           ` + r.acesos.join("\n           "));
  console.log();
}

ws.close(); chrome.kill();
try { rmSync(perfil, { recursive: true, force: true }); } catch {}
process.exit(0);
