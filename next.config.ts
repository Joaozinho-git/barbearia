import type { NextConfig } from "next";

// Cabecalhos de seguranca. Antes disto a unica coisa que a resposta dizia era
// "X-Powered-By: Next.js": nenhuma protecao, e o framework anunciado de graca
// para quem procura alvo por versao.
//
// SEM Content-Security-Policy de proposito, e a razao fica registrada aqui para
// ninguem adicionar uma no automatico e derrubar o site. Esta pagina tem DOIS
// scripts inline obrigatorios — o GATE do app/layout.tsx, que roda sincrono no
// <head> antes da primeira pintura, e o <script type="application/ld+json"> do
// dado estruturado — mais um iframe de terceiro (openstreetmap.org) no
// MiniMapa. Uma CSP so funciona aqui com 'unsafe-inline' (que anula boa parte
// do beneficio) ou com nonce por requisicao (que exige tirar a rota do modo
// estatico). Meia CSP e pior que nenhuma: derruba o gate de movimento, o
// JSON-LD e o mapa de uma vez.
const CABECALHOS = [
  // Impede o navegador de "adivinhar" o tipo de um recurso e executar como
  // script algo servido como imagem ou texto.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nao vaza o caminho completo da pagina para terceiros. O site linka para
  // App Barber, WhatsApp, Google Maps e OpenStreetMap; assim eles recebem so
  // o dominio.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Bloqueia enquadrar o site em iframe de outro dominio (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Nada no site pede camera, microfone ou localizacao. Negar por padrao evita
  // que o iframe do mapa peca em nome do dominio.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // SEM experimental.inlineCss, e a razao fica registrada porque a auditoria do
  // Lighthouse pede exatamente isso ("Solicitacoes que bloquearam a
  // renderizacao", 159ms de espera pela folha de 6,4 KB) e o conselho parece
  // obvio. Foi ligado, medido e desligado: a pontuacao caiu de 93 para 92, com
  // FCP de 0,8s para 0,9s e TBT de 70ms para 90ms.
  //
  // O motivo esta no payload RSC. Com inlineCss o texto do CSS aparece TRES
  // vezes no HTML — uma no <style> real e mais duas serializadas dentro do
  // `self.__next_f.push(...)`, porque o React descreve o elemento <style> com
  // o CSS inteiro como `children`. O HTML transferido saltou de 9,8 KB para
  // 27,6 KB comprimido. Num link movel estrangulado, os 17,8 KB a mais no
  // caminho critico custam mais do que o round-trip que a flag economiza.
  //
  // Se uma versao futura do Next parar de duplicar o CSS no flight, vale
  // remedir: a ideia esta certa, a implementacao e que ainda nao paga.
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS }];
  },
};

export default nextConfig;
