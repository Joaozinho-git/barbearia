import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Site de pagina unica: uma entrada so, e ela e a raiz. Se algum dia nascer
// uma segunda rota, ela entra aqui — sitemap incompleto e pior que sitemap
// nenhum, porque o buscador passa a confiar nele.
//
// lastModified sai da data do build. Nao ha CMS nem conteudo dinamico, entao a
// unica coisa que de fato muda a pagina e uma nova publicacao.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
