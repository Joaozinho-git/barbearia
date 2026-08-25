import SectionHeader from "./SectionHeader";
import Watermark from "./Watermark";
import { CURSOS } from "@/lib/dados";

export default function Formacao() {
  return (
    <section id="s2" className="glow glow-red py-[58px]">
      <Watermark />

      <div className="cut" aria-hidden="true" />

      <SectionHeader
        num="02"
        titulo="Formação"
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
          <path d="M22 10L12 5 2 10l10 5 10-5Z" />
          <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
        </svg>
      </SectionHeader>

      <h2
        className="reveal font-sans text-[clamp(17px,4.4vw,21px)] font-bold uppercase leading-[1.22] tracking-[-.01em]"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        Formação de profissionais
        <br />
        na área
      </h2>

      <div
        className="reveal mt-[28px] border-t border-line"
        style={{ "--i": 2 } as React.CSSProperties}
      >
        {CURSOS.map((curso) => (
          <details key={curso.nivel} className="border-b border-line">
            <summary className="acc-summary items-baseline gap-[12px] py-[19px]">
              <span className="flex-1 font-sans text-[14px] font-semibold">
                {curso.nivel}
              </span>
              <span className="font-mono text-[11px] tracking-[.06em] text-muted">
                {curso.horas}
              </span>
              <span className="acc-seta text-[10px] text-dim" aria-hidden="true">
                ▼
              </span>
            </summary>

            <div className="pb-[22px]">
              {[
                { rotulo: "Conteúdo", valor: curso.conteudo },
                { rotulo: "Aulas", valor: curso.aulas },
                { rotulo: "Cartão", valor: curso.cartao },
                { rotulo: "Boleto", valor: curso.boleto },
                { rotulo: "À vista", valor: curso.aVista },
              ].map((linha) => (
                <div
                  key={linha.rotulo}
                  className="flex justify-between gap-[16px] border-t border-line py-[9px] text-[12.5px]"
                >
                  <span className="flex-[0_0_96px] font-mono text-[9px] uppercase tracking-[.1em] text-dim">
                    {linha.rotulo}
                  </span>
                  <span className="text-right text-muted">{linha.valor}</span>
                </div>
              ))}

              <div className="flex justify-between gap-[16px] border-t border-line py-[9px] text-[12.5px]">
                <span className="flex-[0_0_96px] font-mono text-[9px] uppercase tracking-[.1em] text-dim">
                  Investimento
                </span>
                <span className="text-right font-display text-[18px] font-bold text-ink">
                  {curso.investimento}
                </span>
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
