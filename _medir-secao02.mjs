import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;

// ARMADILHA DE AMBIENTE: medir contra `next dev` da numeros inventados. O dev
// serve 792 KB de script e 1148 KB de payload; o `next start` do mesmo commit
// serve 140 KB e 491 KB. Rode `npx next build && npx next start -p 3222` e
// meca contra a porta de producao. A checagem la embaixo aborta se detectar o
// dev pelo chunk do next-devtools no HTML.
const URL = process.env.URL_MEDICAO ?? "http://localhost:3222/";

const perfil = mkdtempSync(join(tmpdir(), "cdp-"));

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
  { stdio: "ignore" }
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

// Todo comando tem prazo. Sem isto, uma resposta que nunca chega deixa a
// promessa pendurada para sempre: o processo trava em silencio e o Node sai
// com codigo 13 (top-level await nao resolvido), sem dizer onde parou.
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
// Reduced motion desliga o motion-ok pelo gate: sem isso o .reveal ainda
// carrega translateY(12px) e contamina todos os retangulos medidos.
await cdp("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});

// Trava de ambiente: aborta antes de imprimir numero que nao vale nada.
{
  let html = "";
  try {
    html = await (await fetch(URL)).text();
  } catch {
    console.error(`Nada respondendo em ${URL}. Suba o servidor de producao:`);
    console.error("  npx next build && npx next start -p 3222");
    process.exit(1);
  }
  if (html.includes("next-devtools") || html.includes("__nextjs_original")) {
    console.error(`${URL} e um servidor de DESENVOLVIMENTO.`);
    console.error("Meca contra producao: npx next build && npx next start -p 3222");
    process.exit(1);
  }
}

async function abrir(width, height = 900) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp("Page.navigate", { url: URL });
  await espera(1200);

  // A marca d'agua e loading="lazy" e fica muito abaixo da dobra numa viewport
  // de 375x900. O navegador nem comeca a requisicao: `complete` fica false para
  // sempre e nem onload nem onerror disparam — a versao anterior deste espera
  // travava aqui, para sempre, sem mensagem.
  //
  // Duas correcoes, e as duas sao necessarias: rolar #s2 para a tela ANTES de
  // esperar (e o que dispara o carregamento) e por prazo no Promise (para o
  // caso de a imagem falhar de um jeito que nao emite evento nenhum).
  await js(`(async()=>{
    document.querySelector('#s2').scrollIntoView({block:'start'});
    await new Promise(r=>setTimeout(r,150));
    await document.fonts.ready;
    const i=document.querySelector('.watermark');
    if(i && !i.complete) await new Promise(r=>{
      const t=setTimeout(r,5000);
      i.onload=i.onerror=()=>{clearTimeout(t);r()};
    });
    window.scrollTo(0,0);
    return 1;
  })()`);
  await espera(300);
}

const MEDIR = `(()=>{
  const s2=document.querySelector('#s2');
  const md=document.querySelector('.marca-dagua');
  const img=document.querySelector('.watermark');
  const h2=s2.querySelector('h2');
  const acc=s2.querySelector('h2 + div');
  const cut=s2.querySelector('.cut');
  const r=e=>{const b=e.getBoundingClientRect();return{t:b.top,b:b.bottom,l:b.left,rt:b.right,w:b.width,h:b.height}};

  // Baseline real: um inline-block vazio alinha o proprio bottom a baseline.
  const marca=document.createElement('span');
  marca.style.cssText='display:inline-block;width:0;height:0';
  h2.appendChild(marca);
  const baseUltima=marca.getBoundingClientRect().bottom;
  h2.removeChild(marca);
  const marca2=document.createElement('span');
  marca2.style.cssText='display:inline-block;width:0;height:0';
  h2.insertBefore(marca2,h2.querySelector('br'));
  const basePrimeira=marca2.getBoundingClientRect().bottom;
  h2.removeChild(marca2);

  return {
    s2:r(s2), md:r(md), img:r(img), h2:r(h2), acc:r(acc), cut:r(cut),
    basePrimeira, baseUltima,
    paiEhSection: md.parentElement===s2,
    offsetParent: md.offsetParent ? md.offsetParent.id||md.offsetParent.tagName : null,
    transform: getComputedStyle(img).transform,
    transformMd: getComputedStyle(md).transform,
    zIndex: getComputedStyle(md).zIndex,
    opacidade: getComputedStyle(img).opacity,
    marcasNaPagina: document.querySelectorAll('.marca-dagua').length,
    marcaEmS1: !!document.querySelector('#s1 .marca-dagua'),
    marcaEmS3: !!document.querySelector('#s3 .marca-dagua'),
    detalhes: [...s2.querySelectorAll('details')].map(d=>d.open)
  };
})()`;

const n = (v) => Math.round(v * 10) / 10;

console.log("=".repeat(72));
for (const w of [375, 640, 1280]) {
  await abrir(w);
  const m = await js(MEDIR);
  console.log(`\n### viewport ${w}px`);
  console.log(
    `section#s2: altura ${n(m.s2.h)}px  (top ${n(m.s2.t)}, bottom ${n(m.s2.b)})`
  );
  console.log(
    `logo: ${n(m.img.w)}x${n(m.img.h)}px  | topo ${n(m.img.t - m.s2.t)}px abaixo do topo da secao  | base ${n(m.s2.b - m.img.b)}px acima do rodape`
  );
  console.log(
    `dentro da secao? topo ${m.img.t >= m.s2.t ? "ok" : "ESTOURA"}  base ${m.img.b <= m.s2.b ? "ok" : "ESTOURA"}  ` +
      `esq ${m.img.l >= m.s2.l ? "ok" : "ESTOURA"}  dir ${m.img.rt <= m.s2.rt ? "ok" : "ESTOURA"}`
  );
  console.log(
    `centragem horizontal: folga esq ${n(m.img.l - m.s2.l)}px, dir ${n(m.s2.rt - m.img.rt)}px`
  );
  console.log(
    `topo da logo -> baseline do h2 (1a linha ${n(m.basePrimeira - m.img.t)}px, ultima ${n(m.baseUltima - m.img.t)}px)`
  );
  console.log(
    `faixa dos cursos: ${n(m.acc.t)}..${n(m.acc.b)} | logo ${n(m.img.t)}..${n(m.img.b)} -> ` +
      (m.img.t <= m.acc.t && m.img.b >= m.acc.b
        ? "cobre INTEIRA"
        : `cobre PARTE (${n(((Math.min(m.img.b, m.acc.b) - Math.max(m.img.t, m.acc.t)) / m.acc.h) * 100)}% da altura da faixa)`)
  );
  console.log(
    `transform img: ${m.transform} | transform .marca-dagua: ${m.transformMd} | z-index ${m.zIndex} | opacity ${m.opacidade}`
  );
  console.log(
    `pai e a <section id=s2>? ${m.paiEhSection} | offsetParent: ${m.offsetParent} | marcas na pagina: ${m.marcasNaPagina} (s1: ${m.marcaEmS1}, s3: ${m.marcaEmS3})`
  );
}

// ---- Acordeao: a marca nao pode se mover em relacao ao rodape ----
console.log("\n" + "=".repeat(72));
console.log("### acordeao a 1280px — distancia da logo ate o rodape da secao");
await abrir(1280);
const estados = [
  ["fechado", "[...document.querySelectorAll('#s2 details')].forEach(d=>d.open=false)"],
  ["1 aberto", "[...document.querySelectorAll('#s2 details')].forEach((d,i)=>d.open=i===0)"],
  ["3 abertos", "[...document.querySelectorAll('#s2 details')].forEach(d=>d.open=true)"],
];
for (const [nome, acao] of estados) {
  await js(acao);
  await espera(200);
  const m = await js(MEDIR);
  console.log(
    `${nome.padEnd(10)} secao ${n(m.s2.h).toString().padStart(6)}px | logo ${n(m.img.w)}x${n(m.img.h)}px | ` +
      `base da logo ate o rodape ${n(m.s2.b - m.img.b)}px | topo da logo ate o rodape ${n(m.s2.b - m.img.t)}px`
  );
}

// ---- Contraste real do texto sobre glow + marca ----
console.log("\n" + "=".repeat(72));
console.log("### contraste medido no pixel (glow vermelha + marca a 0.18)");
await abrir(1280, 1400);
await js(`document.querySelectorAll('#s2 details').forEach(d=>d.open=false)`);
await js(`(()=>{
  const s=document.createElement('style');
  s.textContent='#s2, #s2 *:not(.marca-dagua):not(.watermark){color:transparent!important;border-color:transparent!important}';
  document.head.appendChild(s);
  document.querySelector('#s2').scrollIntoView({block:'start'});
})()`);
await espera(400);
// A caixa vem em coordenadas de DOCUMENTO (soma do scroll), e nao do que esta
// visivel na tela. A versao anterior recortava so o pedaco de #s2 dentro da
// viewport — ou seja, o TOPO da secao. Mas a marca d'agua e a .glow-red sao as
// duas ancoradas por bottom: nenhuma das duas caia no recorte, e o pixel de
// fundo "mais claro" saia RGB(5,5,5), que e o fundo puro da pagina. O numero
// impresso nao media nada.
//
// As chaves tambem estavam erradas: Page.captureScreenshot exige width/height,
// e a caixa entregava w/h. O CDP respondia "Failed to deserialize
// params.clip.height - mandatory field missing".
const caixa = await js(`(()=>{
  const b=document.querySelector('#s2').getBoundingClientRect();
  return {
    x: b.left + window.scrollX,
    y: b.top + window.scrollY,
    width: b.width,
    height: b.height,
  };
})()`);
const shot = await cdp("Page.captureScreenshot", {
  format: "png",
  clip: { ...caixa, scale: 1 },
  // Sem isto o recorte para na borda da viewport e a secao sai cortada.
  captureBeyondViewport: true,
});
const { data, info } = await sharp(Buffer.from(shot.data, "base64"))
  .raw()
  .toBuffer({ resolveWithObject: true });

const lin = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const Ltexto = L(0xb6, 0xb0, 0x9e);
const Link = L(0xee, 0xea, 0xe2);
const contraste = (Lt, Lf) => {
  const [a, b] = [Lt, Lf].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};

let pior = -1;
let piorPx = null;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    const l = L(data[i], data[i + 1], data[i + 2]);
    if (l > pior) {
      pior = l;
      piorPx = [data[i], data[i + 1], data[i + 2], x, y];
    }
  }
}
console.log(
  `area amostrada: ${info.width}x${info.height}px do fundo da secao 02 (texto e bordas ocultados)`
);
console.log(
  `pixel de fundo mais claro: RGB(${piorPx[0]},${piorPx[1]},${piorPx[2]}) em x=${piorPx[3]} y=${piorPx[4]}`
);
console.log(
  `contraste no pior ponto -> muted/dim #B6B09E: ${contraste(Ltexto, pior).toFixed(2)}:1 (min 4.5) ${contraste(Ltexto, pior) >= 4.5 ? "passa" : "FALHA"}`
);
console.log(
  `contraste no pior ponto -> ink #EEEAE2:       ${contraste(Link, pior).toFixed(2)}:1 (min 4.5) ${contraste(Link, pior) >= 4.5 ? "passa" : "FALHA"}`
);

ws.close();
chrome.kill();
await espera(300);
try {
  rmSync(perfil, { recursive: true, force: true });
} catch {}
