import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// A barbearia nao tem Google Meu Negocio: o JSON-LD do layout, este robots e o
// sitemap sao os unicos sinais estruturados que o buscador recebe sobre ela.
//
// /_next/ fora do rastreamento: sao chunks e imagens otimizadas, nao conteudo,
// e so gastam orcamento de rastreio.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/_next/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
