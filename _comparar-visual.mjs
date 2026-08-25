// Prova de "nao mudou nada visual".
//
// Captura a pagina inteira em 320, 390 e 430px (DPR 2), com os acordeoes
// fechados e abertos, e compara duas capturas pixel a pixel.
//
//   npx next build && npx next start -p 3222
//   node _comparar-visual.mjs capturar antes     # antes de mexer no codigo
//   ...edita, npx next build, reinicia o servidor...
//   node _comparar-visual.mjs capturar depois
//   node _comparar-visual.mjs comparar antes depois
//
// As capturas vao para _visual/<nome>/. A pasta esta no .gitignore.
//
// O estado capturado e o de REPOUSO: o script injeta um <style> que congela
// animacao e transicao e forca o estado final do sistema de reveal. Sem isso a
// comparacao mediria o instante da animacao, nao o layout. O mesmo style entra
// nas duas capturas, entao ele nao esconde diferenca real de layout.
//
// Determinismo verificado: duas execucoes seguidas sem tocar em nada dao
// arquivos identicos byte a byte. Se der diferenca, ela e do codigo.
//
// mobile:false de proposito. Com mobile:true o Chrome reporta innerWidth 892
// (o scrollWidth vazado pelas glows) e o segundo resize entra em realimentacao
// com a altura da pagina. O layout renderizado e identico nos dois modos —
// medido: mesmas alturas de secao em 320 e 390px.
import sharp from "sharp";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9344;
const URL = process.env.URL_MEDICAO ?? "http://localhost:3222/";
const RAIZ = "_visual";
const LARGURAS = [320, 390, 430];

const [comando, a, b] = process.argv.slice(2);
if (comando === "comparar") comparar(join(RAIZ, a), join(RAIZ, b));
else if (comando === "capturar") await capturar(join(RAIZ, a ?? "captura"));
else {
  console.error("uso: node _comparar-visual.mjs capturar <nome>");
  console.error("     node _comparar-visual.mjs comparar <antes> <depois>");
  process.exit(1);
}

// ---------------------------------------------------------------- captura ---
async function capturar(destino) {
  mkdirSync(destino, { recursive: true });
  const perfil = mkdtempSync(join(tmpdir(), "cdp-visual-"));
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

  let alvo = null;
  for (let i = 0; i < 80 && !alvo; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      alvo = lista.find((t) => t.type === "page")?.webSocketDebuggerUrl ?? null;
    } catch {}
    if (!alvo) await espera(250);
  }
  if (!alvo) throw new Error("Chrome nao subiu");

  const ws = new WebSocket(alvo);
  await new Promise((r) => (ws.onopen = r));

  let id = 0;
  const pendentes = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    const p = m.id && pendentes.get(m.id);
    if (!p) return;
    pendentes.delete(m.id);
    clearTimeout(p.prazo);
    if (m.error) p.rej(new Error(JSON.stringify(m.error)));
    else p.res(m.result);
  };

  // Prazo em todo comando: sem isto uma resposta perdida trava o processo em
  // silencio e o Node sai com codigo 13, sem dizer onde parou.
  const cdp = (metodo, params = {}, prazoMs = 60000) =>
    new Promise((res, rej) => {
      const i = ++id;
      const prazo = setTimeout(() => {
        pendentes.delete(i);
        rej(new Error(`CDP sem resposta em ${prazoMs}ms: ${metodo}`));
      }, prazoMs);
      pendentes.set(i, { res, rej, prazo });
      ws.send(JSON.stringify({ id: i, method: metodo, params }));
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

  const ASSENTAR = `(()=>{
    const s=document.createElement('style');
    s.textContent='*,*::before,*::after{animation:none!important;transition:none!important}'
      +'.reveal{opacity:1!important;transform:none!important}'
      +'.cut{transform:scaleX(1)!important}';
    document.head.appendChild(s);
    return 1;
  })()`;

  // A marca d'agua e loading="lazy" e fica abaixo da dobra: sem rolar a pagina
  // inteira o navegador nem comeca a requisicao, e a captura sai sem ela.
  const CARREGAR_TUDO = `(async()=>{
    const h=document.documentElement.scrollHeight;
    for(let y=0;y<h;y+=300){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,16));}
    window.scrollTo(0,0);
    await document.fonts.ready;
    const imgs=[...document.images];
    await Promise.all(imgs.map(i=>i.complete?1:new Promise(r=>{
      const t=setTimeout(r,5000); i.onload=i.onerror=()=>{clearTimeout(t);r();};
    })));
    return imgs.filter(i=>i.complete&&i.naturalWidth>0).length+'/'+imgs.length;
  })()`;

  for (const largura of LARGURAS) {
    for (const abertos of [false, true]) {
      const nome = `w${largura}-${abertos ? "aberto" : "fechado"}`;

      await cdp("Emulation.setDeviceMetricsOverride", {
        width: largura, height: 900, deviceScaleFactor: 2, mobile: false,
      });
      await cdp("Page.navigate", { url: URL });
      await espera(1500);
      await js(ASSENTAR);
      const imgs = await js(CARREGAR_TUDO);
      if (abertos) {
        await js(`document.querySelectorAll('details').forEach(d=>d.open=true);1`);
        await espera(200);
      }
      await espera(400);

      // Viewport do tamanho da pagina: com captureBeyondViewport os elementos
      // position:fixed saem em lugar imprevisivel entre execucoes.
      const alturaTotal = await js("document.documentElement.scrollHeight");
      await cdp("Emulation.setDeviceMetricsOverride", {
        width: largura, height: alturaTotal, deviceScaleFactor: 2, mobile: false,
      });
      await espera(500);
      const alturaFinal = await js("document.documentElement.scrollHeight");

      const shot = await cdp("Page.captureScreenshot", {
        format: "png",
        clip: { x: 0, y: 0, width: largura, height: alturaFinal, scale: 1 },
        captureBeyondViewport: false,
      });
      writeFileSync(join(destino, `${nome}.png`), Buffer.from(shot.data, "base64"));
      console.log(`${nome}.png  ${largura}x${alturaFinal}  imagens ${imgs}`);
    }
  }

  ws.close();
  chrome.kill();
  await espera(400);
  try { rmSync(perfil, { recursive: true, force: true }); } catch {}
}

// -------------------------------------------------------------- comparacao ---
async function comparar(pastaA, pastaB) {
  const nomes = readdirSync(pastaA).filter((f) => f.endsWith(".png")).sort();
  let houveDif = false;

  for (const nome of nomes) {
    const [a, b] = await Promise.all([
      sharp(join(pastaA, nome)).raw().toBuffer({ resolveWithObject: true }),
      sharp(join(pastaB, nome)).raw().toBuffer({ resolveWithObject: true }),
    ]);

    if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
      houveDif = true;
      console.log(
        `${nome.padEnd(18)} ALTURA/LARGURA MUDOU  ${a.info.width}x${a.info.height} -> ${b.info.width}x${b.info.height}`,
      );
      continue;
    }

    const canais = a.info.channels;
    let dif = 0, deltaMax = 0, x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
    for (let i = 0; i < a.data.length; i += canais) {
      const d = Math.max(
        Math.abs(a.data[i] - b.data[i]),
        Math.abs(a.data[i + 1] - b.data[i + 1]),
        Math.abs(a.data[i + 2] - b.data[i + 2]),
      );
      if (!d) continue;
      dif++;
      if (d > deltaMax) deltaMax = d;
      const px = i / canais;
      const x = px % a.info.width;
      const y = (px - x) / a.info.width;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }

    if (!dif) {
      console.log(`${nome.padEnd(18)} identico  (${a.info.width}x${a.info.height})`);
      continue;
    }
    houveDif = true;
    // Divide por 2 porque a captura e DPR 2: o retangulo sai em px CSS.
    console.log(
      `${nome.padEnd(18)} ${dif} px diferentes, delta max ${deltaMax}, ` +
        `retangulo CSS x ${x0 / 2}..${x1 / 2}  y ${y0 / 2}..${y1 / 2}`,
    );
  }

  console.log(houveDif ? "\n>>> HOUVE DIFERENCA" : "\n>>> TUDO IDENTICO");
  if (houveDif) process.exitCode = 1;
}
