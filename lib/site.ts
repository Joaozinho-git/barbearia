// Endereco publico do site. SO PODE SER IMPORTADO POR CODIGO DE SERVIDOR:
// app/layout.tsx, app/robots.ts e app/sitemap.ts. Nao vive no lib/dados.ts
// porque aquele arquivo e importado por componente "use client", e
// VERCEL_PROJECT_PRODUCTION_URL nao existe no bundle do navegador — chegaria
// la como undefined e o fallback trocaria o dominio por localhost em silencio.
//
// ATENCAO: o valor e resolvido em BUILD TIME, nao em runtime. A rota "/" e
// estatica (o next build a marca com "○ Static"), entao o canonical, o og:url
// e o JSON-LD ficam assados no HTML pre-renderizado. Trocar a variavel na
// Vercel sem refazer o build NAO muda o HTML publicado: e preciso republicar.
//
// APOS O DEPLOY: definir NEXT_PUBLIC_SITE_URL nas Environment Variables da
// Vercel, com o dominio de producao e COM https:// na frente. Sem o esquema, o
// new URL() do metadataBase lanca excecao e o build falha.
//
// VERCEL_PROJECT_PRODUCTION_URL e a rede de seguranca para o build feito antes
// de alguem lembrar de configurar a variavel: ela e o dominio de producao do
// projeto e NAO muda a cada push. Sem ela, esse primeiro deploy publicaria
// canonical e og:url apontando para http://localhost:3000 — que e exatamente
// o que o Google indexaria.
//
// Nao usar VERCEL_URL: ela retorna a URL daquele deploy especifico e muda a
// cada push, o que faria o canonical e o og:url mudarem toda publicacao.
const DOMINIO_VERCEL = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (DOMINIO_VERCEL ? `https://${DOMINIO_VERCEL}` : "http://localhost:3000");
