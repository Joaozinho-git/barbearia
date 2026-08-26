import type { Metadata } from "next";
import { Fraunces, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

import {
  ENDERECO,
  INSTAGRAM_URL,
  LINKS,
  NEGOCIO,
  TELEFONE_E164,
} from "@/lib/dados";
// Server-only: veja o cabecalho do lib/site.ts antes de importar em outro
// lugar. O robots.ts e o sitemap.ts leem a mesma constante.
import { SITE_URL } from "@/lib/site";

// Cada peso declarado aqui vira @font-face. Fraunces e Space Grotesk sao
// fontes variaveis: todos os pesos apontam para o MESMO arquivo, entao pedir um
// peso a mais nao custa byte nenhum. IBM Plex Mono nao e variavel — cada peso e
// um arquivo, e o next/font poe rel=preload em todos, ou seja, o navegador
// baixa mesmo os que nenhum elemento usa.
//
// Pesos em uso, mapeados no codigo inteiro:
//   Fraunces      500 italico (2x) e 700 normal (5x)
//   Space Grotesk 400 (corpo), 600 (2x) e 700 (4x)
//   IBM Plex Mono 400 e so — nenhum elemento .font-mono carrega classe de peso
//
// O 500 do Plex Mono era 10 KB de woff2 pre-carregados em toda primeira visita
// sem nada para pintar. NAO reintroduzir sem antes usar de fato.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-plex-mono",
  display: "swap",
});

// TITULO, DESCRICAO e OG_ALT sao literais de proposito: sao copy editorial, e
// nao devem mudar sozinhos se alguem editar uma constante do lib/dados.ts.
// A regra de "nada literal" vale para o JSONLD abaixo, que e dado estruturado.
const TITULO = "Santos Dumont Barbearia — Vacaria/RS";
// "de segunda a sábado" e nao "todos os dias": o lib/dados.ts registra domingo
// fechado. A frase anterior contradizia os horarios exibidos no proprio site.
const DESCRICAO =
  "Barbearia em Vacaria/RS desde 2016. Quatro profissionais, atendimento de segunda a sábado e formação de barbeiros. Agendamento pelo App Barber.";
const OG_ALT = "Santos Dumont Barbearia — Vacaria/RS, desde 2016";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: NEGOCIO.nome,
    title: TITULO,
    description: DESCRICAO,
    images: [
      {
        url: "/og-santos-dumont.png",
        width: 1200,
        height: 630,
        alt: OG_ALT,
      },
    ],
  },
  // As tags twitter:* nao sao "para o Twitter". WhatsApp, Telegram, Discord,
  // Slack e LinkedIn leem elas como fallback quando o Open Graph vem
  // incompleto. O summary_large_image e o que garante imagem em largura cheia
  // em vez de miniatura. Como o canal principal deste site e o WhatsApp, sao
  // tres linhas que protegem exatamente onde mais importa. NAO remover.
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRICAO,
    images: ["/og-santos-dumont.png"],
  },
};

// Roda de forma síncrona durante o parse do HTML, antes da primeira pintura.
// O servidor já entrega motion-ok; aqui só REMOVEMOS quando o aparelho reprova.
// Ausência de API nunca reprova: Safari não expõe deviceMemory nem connection.
// O scrollRestoration manual impede o navegador de restaurar a posição ao
// recarregar, que e o comportamento correto aqui: a pagina tem cinco secoes
// com ancora e o indice cuida da navegacao entre elas. E a
// API própria para isso: forçar o topo por script causaria flash visual.
//
// ---- FAILSAFE DE HIDRATACAO — nao remover ----
// A regra `.motion-ok .reveal { opacity: 0 }` esconde 17 blocos de conteudo, e
// quem devolve opacity 1 e o componente Reveal, que vive num chunk de
// JavaScript. Se o CSS carregar e esse chunk NAO carregar — rede movel
// instavel, chunk 404 logo depois de um deploy, extensao de navegador, CSP mal
// configurada — o site fica com o hero intacto e as secoes 01 a 04 em branco:
// sem equipe, sem precos, sem endereco, sem WhatsApp, sem horarios. O
// <noscript> abaixo NAO cobre esse caso, porque o JavaScript esta habilitado;
// ele so falhou em chegar.
//
// Este setTimeout e a rede de seguranca, e vive aqui de proposito: o GATE e
// inline, entao roda mesmo quando nenhum chunk carrega. O componente Reveal
// grava data-hidratado no <html> ao montar; se em 2,5s a marca nao existir,
// desligamos o motion-ok e o conteudo aparece — sem animacao, mas legivel.
//
// No caminho feliz o React hidrata em dezenas de milissegundos, a marca chega
// muito antes do prazo e este timeout nao faz absolutamente nada: nenhum pixel
// muda. NAO inverter a logica do CSS para "resolver" isso deixando .reveal
// visivel por padrao — daria flash de conteudo (aparece, some, reaparece).
const GATE = `(function(){try{var d=document.documentElement,n=navigator,c=n.connection;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||(n.deviceMemory&&n.deviceMemory<2)||(n.hardwareConcurrency&&n.hardwareConcurrency<4)||(c&&(c.effectiveType==='2g'||c.effectiveType==='slow-2g')))d.classList.remove('motion-ok');setTimeout(function(){if(!d.dataset.hidratado)d.classList.remove('motion-ok')},2500);if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}})()`;

// JSON-LD de negocio local. A barbearia nao tem Google Meu Negocio, entao este
// e o unico sinal estruturado que o Google recebe sobre ela existir.
// Nenhum dado de negocio e literal aqui: tudo vem do lib/dados.ts, porque
// schema divergente do site gera indexacao errada.
//
// SEM priceRange: os precos conhecidos sao dos CURSOS, e o priceRange de um
// HairSalon se refere ao servico de barbearia. Declarar seria dado falso.
// SEM geo: coordenadas nao confirmadas. O Google geocodifica pelo endereco,
// que esta completo com CEP.
// SEM aggregateRating e SEM review: nao ha avaliacoes verificadas. Inventar
// viola as diretrizes de dados estruturados do Google e pode gerar penalidade.
// taxID e o campo correto para CNPJ. vatID seria imposto sobre valor agregado.
const JSONLD = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  "@id": `${SITE_URL}/#negocio`,
  name: NEGOCIO.nome,
  url: SITE_URL,
  image: `${SITE_URL}/og-santos-dumont.png`,
  logo: `${SITE_URL}/logo-santos-dumont.png`,
  telephone: TELEFONE_E164,
  foundingDate: NEGOCIO.desde,
  taxID: NEGOCIO.cnpj,
  currenciesAccepted: "BRL",
  address: {
    "@type": "PostalAddress",
    streetAddress: ENDERECO.rua,
    addressLocality: ENDERECO.cidade,
    addressRegion: ENDERECO.estado,
    postalCode: ENDERECO.cep,
    addressCountry: ENDERECO.pais,
  },
  areaServed: { "@type": "City", name: ENDERECO.cidade },
  hasMap: LINKS.maps,
  sameAs: [INSTAGRAM_URL],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "12:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "14:00",
      closes: "21:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "06:30",
      closes: "12:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "13:30",
      closes: "19:00",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${spaceGrotesk.variable} ${plexMono.variable} motion-ok`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: GATE }} />
        <noscript>
          <style>{`
            .motion-ok .reveal { opacity: 1 !important; transform: none !important; }
            .motion-ok .cut { transform: scaleX(1) !important; }
          `}</style>
        </noscript>
      </head>
      <body>
        {/* O `<` sai escapado como < antes de entrar no
            dangerouslySetInnerHTML. Nao e paranoia decorativa: JSON.stringify
            NAO escapa `<`, entao o dia em que algum campo do lib/dados.ts
            contiver a sequencia de fechamento de script — um nome, um
            endereco, qualquer texto colado de fora — ela encerraria esta tag e
            o resto do valor viraria HTML executavel na pagina.

            Hoje nenhum dado tem `<` (verificado no HTML servido), entao isto
            nao corrige bug ativo: fecha a porta antes. Escapar so o `<` basta,
            porque e o unico caractere capaz de encerrar a tag, e o resultado
            segue sendo JSON valido — < e a mesma string para qualquer
            parser, e o Google le o dado estruturado igual. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(JSONLD).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
