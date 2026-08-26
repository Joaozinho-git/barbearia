import Image from "next/image";
import { LINKS } from "@/lib/dados";

export default function Hero() {
  return (
    <section id="s0" className="relative pb-[48px] pt-[66px]">
      <Image
        src="/aviao-14bis.png"
        alt=""
        width={1280}
        height={800}
        sizes="(max-width: 640px) 55vw, 400px"
        priority
        className="aviao"
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          className="hero-item mb-[16px] flex items-center gap-[8px]"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          <span
            aria-hidden="true"
            className="h-[2px] w-[26px] shrink-0 bg-[image:linear-gradient(90deg,var(--color-wood)_50%,var(--color-chrome)_50%)]"
          />
          <span className="font-mono text-[9.5px] uppercase tracking-[.2em] text-wood-lt">
            Vacaria/RS · Desde 2016
          </span>
        </div>

        <div
          className="hero-item border-l border-line pl-[14px]"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <h1 className="font-display uppercase leading-[1.05] tracking-[-.005em]">
            <span className="block text-[clamp(27px,7.4vw,36px)] font-bold text-ink">
              Santos Dumont
            </span>
            <span className="block text-[clamp(20px,5.6vw,26px)] font-medium normal-case italic text-muted">
              Barbearia
            </span>
          </h1>
        </div>

        <p
          className="hero-item mt-[20px] max-w-[37ch] text-[13px] leading-[1.72] text-muted"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          Entregamos excelência para quem não aceita nada menos que o melhor.
        </p>

        <div className="mt-[34px] flex flex-wrap items-center gap-[16px]">
          <a
            href={LINKS.agendamento}
            target="_blank"
            rel="noopener noreferrer"
            className="hero-item border-pole inline-flex h-[46px] items-center px-[22px] font-sans text-[13px] font-semibold uppercase tracking-[.06em] text-wood-lt hover:bg-[rgba(255,255,255,.06)] hover:text-ink"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            Agende aqui
          </a>
          <div
            className="hero-item max-w-[15ch] font-mono text-[9.5px] uppercase leading-[1.6] tracking-[.09em] text-dim"
            style={{ "--i": 4 } as React.CSSProperties}
          >
            Agendamento exclusivamente pelo App Barber
          </div>
        </div>
      </div>
    </section>
  );
}
