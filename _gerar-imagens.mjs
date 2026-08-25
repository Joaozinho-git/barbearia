// Gera os assets derivados da marca a partir de public/logo-santos-dumont.png:
//
//   public/og-santos-dumont.png   1200x630  imagem de compartilhamento (WhatsApp,
//                                           Telegram, LinkedIn, Discord, Slack)
//   app/icon.png                    256x256  favicon (convencao de arquivo do Next)
//   app/apple-icon.png              180x180  icone da tela inicial do iOS
//
// Roda offline, nao entra no bundle e nao precisa do servidor no ar:
//   node _gerar-imagens.mjs
//
// As medidas 1200x630 batem com o width/height declarados no openGraph do
// app/layout.tsx. Se mudar aqui, mudar la.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const LOGO = "public/logo-santos-dumont.png";
const FUNDO = "#050505"; // --color-base
const POLE_RED = "#C6302B";
const POLE_WHITE = "#EDEAE2";
const POLE_BLUE = "#2B4C8C";

// Faixa de poste de barbearia, mesma geometria do .border-pole-thin do
// globals.css: 45 graus, ciclo de 16px em vermelho/branco/azul/branco.
const faixaPole = (largura, altura) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
     <defs>
       <pattern id="p" width="22.627" height="22.627"
                patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
         <rect x="0"  y="0" width="22.627" height="5.657" fill="${POLE_RED}"/>
         <rect x="0"  y="5.657" width="22.627" height="5.657" fill="${POLE_WHITE}"/>
         <rect x="0"  y="11.314" width="22.627" height="5.657" fill="${POLE_BLUE}"/>
         <rect x="0"  y="16.971" width="22.627" height="5.657" fill="${POLE_WHITE}"/>
       </pattern>
     </defs>
     <rect width="100%" height="100%" fill="url(#p)"/>
   </svg>`,
);

// ---- Open Graph 1200x630 ----
{
  const L = 1200;
  const A = 630;
  const FAIXA = 8;
  const larguraLogo = 620;

  const logo = await sharp(LOGO)
    .resize({ width: larguraLogo })
    .png()
    .toBuffer();
  const { height: alturaLogo } = await sharp(logo).metadata();

  const png = await sharp({
    create: { width: L, height: A, channels: 4, background: FUNDO },
  })
    .composite([
      {
        input: logo,
        left: Math.round((L - larguraLogo) / 2),
        // Sobe 12px do centro geometrico: a marca tem o "BARBEARIA" na base e
        // o bloco le como centralizado quando o peso otico fica um pouco acima.
        top: Math.round((A - alturaLogo) / 2) - 12,
      },
      { input: await sharp(faixaPole(L, FAIXA)).png().toBuffer(), left: 0, top: A - FAIXA },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  writeFileSync("public/og-santos-dumont.png", png);
  console.log(`public/og-santos-dumont.png  ${L}x${A}  ${(png.length / 1024).toFixed(1)} KB`);
}

// ---- Favicon e icone de iOS ----
// Recorte do retrato: o letreiro "SANTOS DUMONT / BARBEARIA" vira ruido
// ilegivel a 32px, entao o icone usa so o chapeu e o rosto, que mantem uma
// silhueta reconhecivel mesmo minusculo.
// O recorte para em y=505 de proposito: abaixo disso comeca o "SANTOS DUMONT"
// e uma tira de letra cortada aparece na base do icone a 32px.
const RECORTE = { left: 263, top: 0, width: 505, height: 505 };
const MARGEM = 0.9; // o retrato encostado na borda perde a silhueta do chapeu

for (const [arquivo, lado] of [["app/icon.png", 256], ["app/apple-icon.png", 180]]) {
  const interno = Math.round(lado * MARGEM);
  const retrato = await sharp(LOGO)
    .extract(RECORTE)
    .resize({ width: interno, height: interno })
    .png()
    .toBuffer();

  const png = await sharp({
    create: { width: lado, height: lado, channels: 4, background: FUNDO },
  })
    .composite([{
      input: retrato,
      left: Math.round((lado - interno) / 2),
      top: Math.round((lado - interno) / 2),
    }])
    // Paleta: o retrato e gravura em preto e branco, entao 256 cores nao
    // mudam nada visivel e cortam o arquivo em cerca de 70%.
    .png({ palette: true, compressionLevel: 9 })
    .toBuffer();

  writeFileSync(arquivo, png);
  console.log(`${arquivo}  ${lado}x${lado}  ${(png.length / 1024).toFixed(1)} KB`);
}
