import SectionHeader from "./SectionHeader";
import MiniMapa from "./MiniMapa";
import { LINKS, NEGOCIO } from "@/lib/dados";

export default function Localizacao() {
  return (
    <section id="s3" className="glow glow-white py-[58px]">
      <div className="cut" aria-hidden="true" />

      <SectionHeader
        num="03"
        titulo="Localização"
        className="reveal"
        style={{ "--i": 0 } as React.CSSProperties}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s7-6.4 7-12a7 7 0 10-14 0c0 5.6 7 12 7 12Z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      </SectionHeader>

      <h2
        className="reveal font-sans text-[clamp(17px,4.4vw,21px)] font-bold uppercase leading-[1.22] tracking-[-.01em]"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        Centro de Vacaria
      </h2>

      <p
        className="reveal mt-[14px] max-w-[44ch] text-[13px] leading-[1.72] text-muted"
        style={{ "--i": 2 } as React.CSSProperties}
      >
        No coração da cidade, a poucos passos do centro, sempre de fácil acesso.
      </p>

      <p
        className="reveal mt-[14px] font-mono text-[9.5px] tracking-[.09em] text-dim"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        {NEGOCIO.endereco}
      </p>

      {/* Fora do sistema de reveal de propósito. O bloco troca de conteúdo no
          clique — o botão vira o iframe — e o .reveal só concede opacity 1 ao
          elemento que o observer já marcou. O iframe nasce depois que o
          observer terminou o trabalho dele, e entraria preso em opacity 0. */}
      <MiniMapa />

      <a
        href={LINKS.maps}
        target="_blank"
        rel="noopener noreferrer"
        className="reveal border-pole-thin mt-[24px] flex h-[44px] items-center justify-between px-[16px] font-mono text-[9.5px] uppercase tracking-[.13em] text-muted hover:text-ink"
        style={{ "--i": 4 } as React.CSSProperties}
      >
        <span>Ver no Google Maps</span>
        <span>↗</span>
      </a>
    </section>
  );
}
