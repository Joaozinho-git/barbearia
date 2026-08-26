// Screenshot pontual da linha de acoes da secao 04, para conferir o icone.
//   npx next start -p 3222 && node _shot-insta.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9362;
const URL = process.env.URL_MEDICAO ?? "http://localhost:3222/";

const perfil = mkdtempSync(join(tmpdir(), "cdp-shot-"));
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

for (const w of [320, 390]) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: 844, deviceScaleFactor: 2, mobile: true, screenWidth: w, screenHeight: 844 });
  await cdp("Page.navigate", { url: URL });
  await espera(1500);
  // clip do CDP e em coordenadas de PAGINA, nao de viewport: por isso a caixa
  // sai do rect + scrollY e a captura pede captureBeyondViewport.
  const caixa = await js(`(() => {
    const a = document.querySelector('#s4 a[href*="wa.me"]');
    const b = a.getBoundingClientRect();
    return { x: 0, y: b.top + scrollY - 110, width: ${w}, height: 260 };
  })()`);
  const { data } = await cdp("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { ...caixa, scale: 2 },
  });
  writeFileSync(`_shot-cta-${w}.png`, Buffer.from(data, "base64"));
  console.log(`_shot-cta-${w}.png`);
}
ws.close();
chrome.kill();
process.exit(0);
