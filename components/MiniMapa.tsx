"use client";

import { useState } from "react";

const MAPA_SRC =
  "https://www.openstreetmap.org/export/embed.html?bbox=-50.9347%2C-28.5066%2C-50.9307%2C-28.5046&layer=mapnik&marker=-28.505607%2C-50.932734";

// O botao NAO passa mais pelo gate de motion-ok. Ele passava, e o efeito nao
// era "mapa sem animacao": eram 200px de conteudo sumindo para quem pede menos
// movimento ou tem menos de 4 nucleos de CPU — sem nenhum mapa e sem nenhum
// aviso. O gate existe para cortar animacao, nao conteudo.
//
// O custo continua sob controle porque o iframe so entra no toque: aparelho
// fraco nao baixa mapa nenhum sem pedir. Renderizar sempre tambem tira o
// pop-in que existia (o botao aparecia so depois da hidratacao) e dispensa o
// setState dentro de useEffect que o react-hooks/set-state-in-effect apontava.
export default function MiniMapa() {
  const [carregado, setCarregado] = useState(false);

  if (!carregado) {
    return (
      <button
        type="button"
        aria-label="Carregar mapa interativo da localização"
        onClick={() => setCarregado(true)}
        style={{
          width: "100%",
          height: "180px",
          marginTop: "20px",
          border: "1px solid var(--color-line)",
          background: "var(--color-raise)",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden="true"
          style={{ color: "var(--color-dim)" }}
        >
          <path d="M12 22s7-6.4 7-12a7 7 0 10-14 0c0 5.6 7 12 7 12Z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9.5px",
            letterSpacing: ".13em",
            textTransform: "uppercase",
            color: "var(--color-muted)",
          }}
        >
          Ver o mapa
        </span>
      </button>
    );
  }

  return (
    <>
      <div
        style={{
          marginTop: "20px",
          border: "1px solid var(--color-line)",
          overflow: "hidden",
        }}
      >
        {/* sandbox: o openstreetmap.org e codigo de terceiro rodando dentro da
            pagina e nao ha CSP para conte-lo (o porque esta no next.config.ts).
            allow-scripts e allow-same-origin sao o minimo para o mapa desenhar
            e arrastar — o allow-same-origin vale para a origem DELE, nao para
            a nossa, entao nao da acesso a nada daqui. O que fica bloqueado e o
            que interessa: navegar a aba de cima para fora do site, abrir
            popup, enviar formulario e disparar download.

            referrerPolicy alinhado ao cabecalho global do next.config.ts. O
            no-referrer-when-downgrade anterior mandava a URL completa da
            pagina para o servidor do mapa. */}
        <iframe
          src={MAPA_SRC}
          title="Mapa da localização da Santos Dumont Barbearia"
          width="100%"
          height="180"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ border: 0, display: "block" }}
          className="mapa-frame"
        />
      </div>
      <p
        style={{
          marginTop: "6px",
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
          letterSpacing: ".06em",
          color: "var(--color-dim)",
        }}
      >
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          © OpenStreetMap
        </a>
      </p>
    </>
  );
}
