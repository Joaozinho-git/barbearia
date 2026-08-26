// Compara duas capturas do _comparar-visual.mjs quando a ALTURA mudou de
// proposito: recorta as duas na altura menor e diffa a regiao comum.
//
//   node _comparar-comum.mjs <antes> <depois>
//
// Serve para provar que a mudanca de altura foi a UNICA mudanca: se a regiao
// comum bate, nada mais se mexeu.
import sharp from "sharp";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const [a, b] = process.argv.slice(2);
if (!a || !b) {
  console.error("uso: node _comparar-comum.mjs <antes> <depois>");
  process.exit(1);
}
const dirA = join("_visual", a);
const dirB = join("_visual", b);

let houve = false;
for (const arq of readdirSync(dirA).filter((f) => f.endsWith(".png"))) {
  let mA, mB;
  try {
    mA = await sharp(join(dirA, arq)).metadata();
    mB = await sharp(join(dirB, arq)).metadata();
  } catch {
    console.log(`${arq.padEnd(18)} ausente em um dos lados`);
    houve = true;
    continue;
  }
  if (mA.width !== mB.width) {
    console.log(`${arq.padEnd(18)} LARGURA diferente ${mA.width} vs ${mB.width}`);
    houve = true;
    continue;
  }
  const h = Math.min(mA.height, mB.height);
  const rec = { left: 0, top: 0, width: mA.width, height: h };
  const pA = await sharp(join(dirA, arq)).extract(rec).raw().toBuffer();
  const pB = await sharp(join(dirB, arq)).extract(rec).raw().toBuffer();

  let dif = 0, maxD = 0, x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
  const canais = pA.length / (mA.width * h);
  for (let i = 0; i < pA.length; i += canais) {
    let d = 0;
    for (let c = 0; c < Math.min(3, canais); c++) d = Math.max(d, Math.abs(pA[i + c] - pB[i + c]));
    if (d > 0) {
      dif++;
      if (d > maxD) maxD = d;
      const px = (i / canais) % mA.width, py = Math.floor(i / canais / mA.width);
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
  }
  const alturaNota = mA.height === mB.height ? "" : `  [altura ${mA.height}->${mB.height}, comparados os ${h} primeiros]`;
  if (dif === 0) console.log(`${arq.padEnd(18)} regiao comum IDENTICA${alturaNota}`);
  else {
    houve = true;
    console.log(`${arq.padEnd(18)} ${dif} px diferentes, delta max ${maxD}, x ${x0 / 2}..${x1 / 2} y ${y0 / 2}..${y1 / 2}${alturaNota}`);
  }
}
console.log();
console.log(houve ? ">>> HOUVE DIFERENCA NA REGIAO COMUM" : ">>> REGIAO COMUM TODA IDENTICA");
