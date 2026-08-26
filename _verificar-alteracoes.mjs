// Verificacao das tres alteracoes de 2026-08-26, medida em mobile:true.
//
//   npx next build && npx next start -p 3222
//   node _verificar-alteracoes.mjs
//
// Mede em mobile:true de proposito: e o modo que reproduz o aparelho real e o
// unico onde a viewport de LAYOUT aparece inflada quando algo volta a vazar na
// horizontal. O _comparar-visual.mjs captura em mobile:false e nao veria.
//
// O que precisa passar, em TODAS as larguras:
//   coluna ......... largura = min(viewport, 652) - 92, igual a de antes
//   indice ......... termina 8px antes do texto, sem sobrepor
//   vazamento ...... scrollWidth = clientWidth e innerWidth = largura da tela
//   sobra vertical . ~0 depois do rodape
//   hero ........... "Santos Dumont" antes de "Barbearia", fontes trocadas junto
//   horarios ....... segunda a sexta fecha 21:30
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9357;
const URL = process.env.URL_MEDICAO ?? "http://localhost:3222/";
const SAIDA = "_medicao-alteracoes.txt";

// Soma dos paddings do main. E a invariante da alteracao 1: 72+20 virou 52+40,
// entao a coluna de texto tem de continuar com a largura exata de antes.
const PADDING_TOTAL = 92;
const MAX_MAIN = 652;
const RESPIRO = 8;

const linhas = [];
const log = (s = "") => linhas.push(s);
let reprovas = 0;
const exigir = (ok, texto) => {
  log(`  ${ok ? "ok  " : "FALHA"}  ${texto}`);
  if (!ok) reprovas++;
};

const perfil = mkdtempSync(join(tmpdir(), "cdp-alt-"));
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
}

async function abrir(width, height) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: width,
    screenHeight: height,
  });
  await cdp("Page.navigate", { url: URL });
  await espera(1400);
}

// A leitura sai toda de uma vez, na mesma passada de layout: pedir em chamadas
// separadas deixaria o accordion ou uma fonte tardia mudar a geometria no meio.
const MEDIR = `(() => {
  const raiz = document.documentElement;
  const main = document.querySelector("main");
  const nav = document.querySelector(".idx-nav");
  const estilo = getComputedStyle(main);
  const caixa = main.getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  const spans = [...document.querySelectorAll("h1 span")].map((s) => ({
    texto: s.textContent.trim(),
    tamanho: getComputedStyle(s).fontSize,
    peso: getComputedStyle(s).fontWeight,
    estilo: getComputedStyle(s).fontStyle,
    topo: Math.round(s.getBoundingClientRect().top * 10) / 10,
  }));
  const semana = [...document.querySelectorAll("#s4 dt, #s4 li, #s4 div, #s4 p")]
    .map((e) => e.textContent.trim())
    .filter((t) => t.startsWith("Segunda a sexta"))[0] ?? "";
  return {
    pl: parseFloat(estilo.paddingLeft),
    pr: parseFloat(estilo.paddingRight),
    esq: Math.round((caixa.left + parseFloat(estilo.paddingLeft)) * 10) / 10,
    dir: Math.round((caixa.right - parseFloat(estilo.paddingRight)) * 10) / 10,
    navEsq: Math.round(n.left * 10) / 10,
    navDir: Math.round(n.right * 10) / 10,
    navTopo: Math.round(n.top * 10) / 10,
    navBase: Math.round(n.bottom * 10) / 10,
    alvo: (() => {
      const a = document.querySelector(".idx-nav a");
      const r = a.getBoundingClientRect();
      const d = getComputedStyle(a, "::after");
      return {
        largura: Math.round(r.width * 100) / 100,
        altura: Math.round(r.height * 100) / 100,
        insetTopo: d.top,
        insetLado: d.left,
      };
    })(),
    clientWidth: raiz.clientWidth,
    scrollWidth: raiz.scrollWidth,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    alturaBody: Math.round(document.body.getBoundingClientRect().height * 10) / 10,
    sobraVertical: Math.round((raiz.scrollHeight - document.body.getBoundingClientRect().height) * 10) / 10,
    spans,
    semana,
  };
})()`;

for (const [w, h] of [
  [320, 640],
  [360, 800],
  [390, 844],
  [412, 823],
  [430, 932],
  [768, 1024],
  [1280, 900],
]) {
  await abrir(w, h);
  const m = await js(MEDIR);
  const coluna = Math.round((m.dir - m.esq) * 10) / 10;
  const esperado = Math.min(w, MAX_MAIN) - PADDING_TOTAL;
  const respiro = Math.round((m.esq - m.navDir) * 10) / 10;

  log(`--- ${w}x${h} (mobile:true) ---`);
  log(
    `  coluna ${m.esq}..${m.dir} = ${coluna}px  |  padding ${m.pl}/${m.pr}  |  ` +
      `indice ${m.navEsq}..${m.navDir} (${Math.round((m.navDir - m.navEsq) * 10) / 10}px)  |  respiro ${respiro}px`,
  );
  log(
    `  viewport client ${m.clientWidth} scroll ${m.scrollWidth} inner ${m.innerWidth}x${m.innerHeight}  |  ` +
      `body ${m.alturaBody}px sobra ${m.sobraVertical}px`,
  );

  exigir(coluna === esperado, `largura da coluna ${coluna} = ${esperado} (a mesma de antes da mudanca)`);
  exigir(respiro >= 6, `indice nao encosta no texto (respiro ${respiro}px >= 6)`);
  exigir(m.navEsq >= 8, `indice nao encosta na borda da tela (${m.navEsq}px >= 8)`);
  exigir(m.scrollWidth === m.clientWidth, `sem vazamento horizontal (${m.scrollWidth} = ${m.clientWidth})`);
  exigir(m.innerWidth === w, `viewport de layout intacta (innerWidth ${m.innerWidth} = ${w})`);
  exigir(Math.abs(m.sobraVertical) <= 1, `sem rolagem morta no fim (${m.sobraVertical}px)`);
  exigir(m.navTopo >= 0 && m.navBase <= h, `indice dentro da tela (${m.navTopo}..${m.navBase} em ${h})`);
  exigir(
    m.alvo.largura >= 24 && m.alvo.altura + 12 >= 24,
    `alvo de toque WCAG 2.5.8: ${m.alvo.largura}x${m.alvo.altura} + inset ${m.alvo.insetTopo}/${m.alvo.insetLado}`,
  );
  exigir(
    m.spans.length === 2 && m.spans[0].texto === "Santos Dumont" && m.spans[1].texto === "Barbearia",
    `hero na ordem nova: ${m.spans.map((s) => s.texto).join(" / ")}`,
  );
  exigir(
    m.spans[0].peso === "700" && m.spans[0].estilo === "normal" &&
      m.spans[1].peso === "500" && m.spans[1].estilo === "italic",
    `fontes seguiram o texto: ${m.spans
      .map((s) => `${s.texto} ${s.tamanho}/${s.peso}/${s.estilo}`)
      .join("  ")}`,
  );
  exigir(
    m.spans[0].topo < m.spans[1].topo,
    `"Santos Dumont" pintado acima de "Barbearia" (${m.spans[0].topo} < ${m.spans[1].topo})`,
  );
  exigir(m.semana.includes("21:30") && !m.semana.includes("19:30"), `horario util: ${m.semana}`);
  log();
}

log(reprovas === 0 ? "TUDO APROVADO" : `${reprovas} REPROVAS`);
writeFileSync(SAIDA, linhas.join("\n"), "utf8");
console.log(linhas.join("\n"));

ws.close();
chrome.kill();
try {
  rmSync(perfil, { recursive: true, force: true });
} catch {}
process.exit(reprovas ? 1 : 0);
