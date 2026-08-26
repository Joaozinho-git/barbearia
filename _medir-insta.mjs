// Medicao pontual da alteracao do Instagram (icone no lugar do @ do rodape).
//
//   npx next build && npx next start -p 3222
//   node _medir-insta.mjs antes    -> grava _insta-antes.json
//   node _medir-insta.mjs depois   -> compara com _insta-antes.json
//
// Mede em mobile:true porque e o modo que reproduz o aparelho real e o unico
// onde a viewport de LAYOUT aparece inflada se algo voltar a vazar na
// horizontal.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9361;
const URL = process.env.URL_MEDICAO ?? "http://localhost:3222/";
const MODO = process.argv[2] ?? "antes";
const ARQ = "_insta-antes.json";
const LARGURAS = [320, 390, 430];

const perfil = mkdtempSync(join(tmpdir(), "cdp-insta-"));
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${perfil}`,
  "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank",
], { stdio: "ignore" });

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
    const { res, rej } = pend.get(m.id);
    pend.delete(m.id);
    if (m.error) rej(new Error(JSON.stringify(m.error)));
    else res(m.result);
  }
};
const cdp = (method, params = {}) =>
  new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => {
  const r = await cdp("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};

await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

const MEDIDA = `(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
    return { x: +(b.x).toFixed(2), y: +(b.y + scrollY).toFixed(2), w: +(b.width).toFixed(2), h: +(b.height).toFixed(2) }; };
  const s4 = document.querySelector("#s4");
  const wpp = document.querySelector('#s4 a[href*="wa.me"]');
  const insta = document.querySelector('#s4 a[href*="instagram"]');
  return {
    doc: { h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth,
           cw: document.documentElement.clientWidth, inner: innerWidth },
    s4: r(s4),
    h2: r(document.querySelector("#s4 h2")),
    wpp: r(wpp),
    insta: insta ? { ...r(insta), href: insta.getAttribute("href"), rel: insta.getAttribute("rel"), label: insta.getAttribute("aria-label") } : null,
    details: r(document.querySelector("#s4 details")),
    footer: r(document.querySelector("#s4 footer")),
    copy: r(document.querySelector("#s4 footer p:last-child")),
    reveals: document.querySelectorAll(".reveal").length,
    textoRodape: document.querySelector("#s4 footer p")?.innerText?.trim() ?? "SEM RODAPE",
    diagnostico: document.querySelector("#s4") ? "s4 ok" : document.body.innerHTML.slice(0, 200),
  };
})()`;

const atual = {};
for (const w of LARGURAS) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: w, screenHeight: 844 });
  await cdp("Page.navigate", { url: URL });
  await espera(1500);
  atual[w] = await js(MEDIDA);
}

if (MODO === "antes") {
  writeFileSync(ARQ, JSON.stringify(atual, null, 2));
  console.log("baseline gravada em", ARQ);
} else {
  if (!existsSync(ARQ)) { console.error("falta a baseline; rode: node _medir-insta.mjs antes"); process.exit(1); }
  const antes = JSON.parse(readFileSync(ARQ, "utf8"));
  let falhas = 0;
  for (const w of LARGURAS) {
    const a = antes[w], d = atual[w];
    console.log(`\n--- ${w}px ---`);
    const cmp = (nome, va, vd) => {
      const igual = JSON.stringify(va) === JSON.stringify(vd);
      if (!igual) falhas++;
      console.log(`  ${igual ? "igual" : "MUDOU"}  ${nome}: ${JSON.stringify(va)} -> ${JSON.stringify(vd)}`);
    };
    for (const k of ["h2", "wpp", "details", "footer", "copy"]) cmp(k, a[k], d[k]);
    cmp("doc", a.doc, d.doc);
    console.log(`  info   rodape antes : ${a.textoRodape}`);
    console.log(`  info   rodape depois: ${d.textoRodape}`);
    console.log(`  info   insta: ${JSON.stringify(d.insta)}`);
    console.log(`  info   reveals: ${a.reveals} -> ${d.reveals}`);
    console.log(`  ${d.doc.w === d.doc.cw && d.doc.inner === w ? "ok   " : "FALHA"}  sem vazamento horizontal`);
    if (!(d.doc.w === d.doc.cw && d.doc.inner === w)) falhas++;
  }
  console.log(falhas ? `\n${falhas} diferenca(s) — confira se sao as esperadas` : "\nnada mudou de posicao");
}
ws.close();
chrome.kill();
process.exit(0);
