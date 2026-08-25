import SectionHeader from "./SectionHeader";
import Contador from "./Contador";

export default function Equipe() {
  return (
    // z-index 0 cria o contexto de empilhamento da secao. O div de zIndex 1
    // abaixo mantem o conteudo acima das camadas de fundo da secao.
    <section
      id="s1"
      className="relative z-0"
      style={{ paddingTop: "58px", paddingBottom: "58px" }}
    >
      <div className="cut" aria-hidden="true" />

      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeader
          num="01"
          titulo="Equipe"
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
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M20 4L8.5 15.5M8.5 8.5L20 20" />
          </svg>
        </SectionHeader>

        <h2
          className="reveal font-sans text-[clamp(17px,4.4vw,21px)] font-bold uppercase leading-[1.22] tracking-[-.01em]"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          {/* "Seis dias" e não "todos os dias": o lib/dados.ts registra domingo
              fechado, o contador logo abaixo diz 06 Dias/semana e o
              openingHoursSpecification do layout declara segunda a sexta mais
              sábado. A frase anterior contradizia os três — e a correção já
              tinha sido feita na DESCRICAO do metadata, mas não aqui, no texto
              que o cliente lê.

              A frase escolhida é medida, não estética: "Seis dias, todos os
              horários" ocupa exatamente a mesma altura de h2 que a frase antiga
              em 320, 390 e 430px (62px, 42px e 46px), então nenhum pixel da
              página se move. "De segunda a sábado, todos os horários" custaria
              uma terceira linha em 390 e 430px, com HORÁRIOS órfão, e
              empurraria tudo abaixo em 21-23px. Qualquer troca futura aqui
              precisa ser medida do mesmo jeito. */}
          Quatro profissionais
          <br />
          Seis dias, todos os horários
        </h2>

        <p
          className="reveal mt-[14px] max-w-[44ch] text-[13px] leading-[1.72] text-muted"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          Uma equipe profissional e qualificada, presente para entregar sempre o
          melhor resultado.
        </p>

        {/* nums-faixa é o gatilho compartilhado dos três contadores: observando
            um elemento único eles disparam no mesmo quadro. */}
        <div
          className="nums-faixa reveal mt-[28px] flex border-t border-line"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          <div
            className="flex-1 border-r border-line"
            style={{ padding: "18px 20px 18px 0" }}
          >
            <b className="block font-display text-[23px] font-bold leading-none tabular-nums text-wood-lt">
              <Contador valor="04" />
            </b>
            <span className="mt-[6px] block font-mono text-[8.5px] uppercase leading-[1.5] tracking-[.1em] text-dim">
              Profissionais
            </span>
          </div>
          <div
            className="flex-1 border-r border-line"
            style={{ padding: "18px 20px" }}
          >
            <b className="block font-display text-[23px] font-bold leading-none tabular-nums text-wood-lt">
              <Contador valor="06" />
            </b>
            <span className="mt-[6px] block font-mono text-[8.5px] uppercase leading-[1.5] tracking-[.1em] text-dim">
              Dias/semana
            </span>
          </div>
          <div className="flex-1" style={{ padding: "18px 20px" }}>
            <b className="block font-display text-[23px] font-bold leading-none tabular-nums text-wood-lt">
              <Contador valor="10" />
            </b>
            <span className="mt-[6px] block font-mono text-[8.5px] uppercase leading-[1.5] tracking-[.1em] text-dim">
              Anos de ofício
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
