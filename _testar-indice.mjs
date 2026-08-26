// Teste de aceitacao do indice lateral, no navegador de verdade — clica nos
// pontos, espera a rolagem terminar e confere qual acendeu.
//
//   npx next build && npx next start -p 3222
//   node _testar-indice.mjs
//
// Cobre os cinco criterios que a mecanica precisa cumprir. Roda em mobile:true,
// que e o modo onde o site vive.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9361;
const URL = process.env.URL_MEDICAO ?? "http://localhost:3222/";
const VIEWPORTS = [[320, 700], [375, 667], [390, 844], [412, 823], [430, 932], [430, 1000]];

const perfil = mkdtempSync(join(tmpdir(), "cdp-ti-"));
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

// Le o ponto aceso pela CLASSE e tambem por aria-current: os dois tem de
// concordar, senao o leitor de tela recebe uma coisa e o olho outra.
const ACESO = `(() => {
  const porClasse = document.querySelector('.idx-nav a.ativo');
  const porAria = document.querySelector('.idx-nav a[aria-current]');
  const num = (el) => el ? el.querySelector('.idx-num').textContent.trim() : null;
  return { classe: num(porClasse), aria: num(porAria) };
})()`;

let falhas = 0;
const checar = (cond, msg) => {
  if (!cond) { falhas++; console.log(`   FALHA  ${msg}`); }
};

for (const [w, h] of VIEWPORTS) {
  console.log(`---- ${w}x${h}`);
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: w, height: h, deviceScaleFactor: 2, mobile: true, screenWidth: w, screenHeight: h,
  });
  await cdp("Page.navigate", { url: URL });
  await espera(1700);

  // A. topo
  let r = await js(ACESO);
  checar(r.classe === "00", `A: no topo acendeu ${r.classe}, esperado 00`);
  checar(r.classe === r.aria, `aria-current (${r.aria}) diferente da classe (${r.classe}) no topo`);

  // B. fim
  await js(`window.scrollTo(0, document.documentElement.scrollHeight); true`);
  await espera(700);
  r = await js(ACESO);
  checar(r.classe === "04", `B: no fim acendeu ${r.classe}, esperado 04`);
  checar(r.classe === r.aria, `aria-current (${r.aria}) diferente da classe (${r.classe}) no fim`);

  // C. clique em cada ponto (com reducao de movimento desligada, para exercitar
  // o caminho de rolagem suave de verdade).
  for (let i = 0; i < 5; i++) {
    await js(`window.scrollTo(0, 0); true`);
    await espera(400);
    await js(`document.querySelectorAll('.idx-nav a')[${i}].click(); true`);
    await espera(2200); // acima do TETO_SUAVE_MS
    r = await js(ACESO);
    const esperado = "0" + i;
    checar(r.classe === esperado, `C: clicar em ${esperado} acendeu ${r.classe}`);
  }

  // D. monotonia ao rolar para baixo, lido do componente montado.
  await js(`window.scrollTo(0, 0); true`);
  await espera(500);
  const seq = [];
  const max = await js(`document.documentElement.scrollHeight - document.documentElement.clientHeight`);
  for (let y = 0; y <= max; y += Math.max(24, Math.round(max / 45))) {
    await js(`window.scrollTo(0, ${y}); true`);
    await espera(90);
    seq.push((await js(ACESO)).classe);
  }
  let regrediu = false;
  for (let i = 1; i < seq.length; i++) if (Number(seq[i]) < Number(seq[i - 1])) regrediu = true;
  checar(!regrediu, `D: o ponto andou para tras: ${seq.join(">")}`);

  // E. cobertura
  for (let i = 0; i < 5; i++) {
    checar(seq.includes("0" + i), `E: o ponto 0${i} nunca acendeu ao rolar`);
  }
  console.log(`     sequencia: ${[...new Set(seq)].join(" > ")}`);
}

console.log();
console.log(falhas === 0 ? ">>> TODOS OS CRITERIOS PASSARAM" : `>>> ${falhas} FALHAS`);

ws.close(); chrome.kill();
try { rmSync(perfil, { recursive: true, force: true }); } catch {}
process.exit(falhas === 0 ? 0 : 1);
