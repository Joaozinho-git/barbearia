import SectionHeader from "./SectionHeader";
import {
  HORARIOS,
  INSTAGRAM_URL,
  LINKS,
  NEGOCIO,
  TELEFONE_E164,
} from "@/lib/dados";

export default function Contato() {
  return (
    <section id="s4" className="glow glow-blue py-[58px]">
      <div className="cut" aria-hidden="true" />

      <SectionHeader
        num="04"
        titulo="Contato"
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
          <path d="M21 11.5a8.4 8.4 0 01-8.9 8.4 8.6 8.6 0 01-3.4-.7L3 21l1.8-5a8.4 8.4 0 01-.7-3.4A8.4 8.4 0 0112.5 3.7a8.5 8.5 0 018.5 7.8Z" />
        </svg>
      </SectionHeader>

      <h2
        className="reveal font-sans text-[clamp(17px,4.4vw,21px)] font-bold uppercase leading-[1.22] tracking-[-.01em]"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        Dúvidas
        <span className="mt-[3px] block font-display text-[15px] font-medium normal-case italic tracking-[0] text-muted">
          Atendimento por WhatsApp
        </span>
      </h2>

      {/* Linha de acoes: o CTA do WhatsApp e o atalho para o Instagram.
          O `reveal` e o `mt-[22px]` sairam do <a> e vieram para esta div. A div
          e bloco e o <a> era inline-flex, mas medido nas tres larguras o botao
          continua nos MESMOS pixels: a caixa de linha anonima que ele formava
          ja tinha exatamente 46px, sem entrelinha sobrando acima nem abaixo.
          Verificado: h2, botao, accordion, rodape e altura da pagina identicos
          em 320, 390 e 430px.

          gap-[12px] e nao mais que isso: em 320px a coluna tem 228px, o botao
          ocupa 177,2px e o icone 22px — sobram ~17px de folga. Um icone com
          caixa de 46px, ou um gap maior, estoura a coluna e o vazamento
          horizontal volta. Foi por isso que o alvo de toque do Instagram e um
          ::after absoluto, e nao largura de verdade. */}
      <div
        className="reveal mt-[22px] flex items-center gap-[12px]"
        style={{ "--i": 2 } as React.CSSProperties}
      >
        <a
          href={LINKS.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="border-pole inline-flex h-[46px] items-center gap-[9px] px-[20px] text-[12.5px] text-ink hover:opacity-[.82]"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-[14px] w-[14px] fill-muted"
          >
            <path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm0 18a8 8 0 01-4-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
          </svg>
          Falar no WhatsApp
        </a>

        {/* O @ do rodape era texto de 8,5px que quase ninguem lia e quase
            ninguem acertava com o dedo. O mesmo perfil vira icone aqui, ao
            lado do CTA, no ponto em que o visitante ja esta decidindo falar
            com a barbearia.

            aria-label e obrigatorio: sem texto visivel e com o <svg>
            aria-hidden, o link ficaria mudo no leitor de tela. O alvo de 44px
            vem do `#s4 .ig-alvo::after` no globals.css — a caixa continua com
            22px e o layout nao sente.

            O desenho e stroke, nao fill, para casar com os icones de cabecalho
            de secao; currentColor deixa o hover trocar a cor inteira. */}
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram da barbearia"
          className="ig-alvo inline-flex h-[22px] w-[22px] items-center justify-center text-muted hover:text-ink"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-[19px] w-[19px]"
          >
            <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
            <circle cx="12" cy="12" r="4.1" />
            <circle
              cx="17.1"
              cy="6.9"
              r="1.05"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        </a>
      </div>

      <details
        className="reveal mt-[30px]"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <summary className="acc-summary items-center justify-between border-b border-t border-line py-[14px] font-mono text-[9.5px] uppercase tracking-[.16em] text-muted">
          <span>Horários de atendimento</span>
          <span className="acc-seta" aria-hidden="true">
            ▼
          </span>
        </summary>
        <div>
          {HORARIOS.map((horario) => (
            <div
              key={horario.dia}
              className="flex flex-wrap items-baseline justify-between gap-[10px] border-b border-line py-[11px] text-[12.5px]"
            >
              <span>{horario.dia}</span>
              <span className="font-mono text-[10.5px] tracking-[-.01em] text-muted">
                {horario.horas}
              </span>
            </div>
          ))}
        </div>
      </details>

      {/* <footer> e landmark, nao caixa: os unicos landmarks da pagina eram
          <nav> e <main>, e todo o bloco de identificacao — nome, endereco,
          telefone, Instagram, CNPJ e copyright — vivia solto dentro da
          <section>. Quem navega por leitor de tela nao tinha como saltar para
          o contato.

          Sem className de proposito. O <footer> nasce display:block, igual ao
          que os dois <p> ja formavam, e as margens colapsam atraves da borda
          dele exatamente como colapsavam entre irmaos — o mt-[40px] do
          primeiro <p> continua valendo a mesma coisa. Verificado: 0 pixels de
          diferenca em 320, 390 e 430px, altura da pagina inalterada.

          Uma classe qualquer aqui (padding, border, overflow, display) quebra
          esse colapso de margem e move o rodape inteiro. */}
      <footer>
        <p
          className="reveal mt-[40px] pb-[14px] font-mono text-[8.5px] uppercase leading-[2.2] tracking-[.09em] text-dim"
          style={{ "--i": 4 } as React.CSSProperties}
        >
          {NEGOCIO.nome} · Desde {NEGOCIO.desde}
          <br />
          {NEGOCIO.endereco}
          <br />
          {/* O telefone era texto puro: o JSON-LD entregava o numero ao Google
              e o visitante nao conseguia tocar nele, num site que so existe
              para celular. A constante ja estava no lib/dados.ts, consumida
              apenas pelo layout.

              O @ do Instagram ficava aqui do lado, separado por " · ". Saiu:
              virou icone clicavel na linha do CTA, la em cima. O perfil segue
              no JSON-LD (sameAs no layout.tsx), entao o Google nao perdeu
              nada — quem perdeu foi so o texto de 8,5px.

              text-inherit e no-underline nao sao enfeite: sem eles a folha de
              estilo do navegador pinta o link de azul e sublinha, e o rodape
              deixa de ser o rodape aprovado. Qualquer classe nova aqui precisa
              manter o herdado do <p> (font-mono, 8.5px, uppercase, text-dim).

              A area de toque deste link vem do `#s4 p a::after` no globals.css:
              a caixa segue com 11px de altura e o alvo vai a 24px, sem pintar
              nada. O seletor casa por descendencia, entao continua valendo
              dentro do <footer> — mas se este <p> sair de dentro de um <p>, ou
              o id da secao mudar, o alvo volta a 11px em silencio. */}
          {/* prettier-ignore */}
          <a href={`tel:${TELEFONE_E164}`} className="text-inherit no-underline">{NEGOCIO.telefoneExibicao}</a>
          <br />
          CNPJ {NEGOCIO.cnpj}
        </p>

        {/* O ano sai do relógio, não de uma constante: o "2026" fixo que estava
            no lib/dados.ts vira mentira em 1º de janeiro de 2027 e ninguém
            lembra de trocar. Este é Server Component numa rota estática, então
            o valor é carimbado no build — cada publicação atualiza o ano. Se o
            site passar um ano inteiro sem redeploy, o rodapé fica um ano atrás;
            é o preço de não ter texto gerado no navegador, que causaria
            divergência de hidratação. */}
        <p className="border-t border-line pb-[36px] pt-[14px] font-mono text-[8.5px] tracking-[.06em] text-dim">
          © {new Date().getFullYear()} {NEGOCIO.nome} — Todos os direitos
          reservados.
        </p>
      </footer>
    </section>
  );
}
