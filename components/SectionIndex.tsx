"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SECOES } from "@/lib/dados";

// Teto, nao duracao. Quem encerra a rolagem suave e o evento scrollend; este
// numero so existe para o navegador que ainda nao o implementa (Safari antigo)
// e para a rolagem que nunca termina porque o usuario interrompeu.
//
// Os 700ms fixos que estavam aqui eram CURTOS DEMAIS: a rolagem de s0 ate s4
// percorre 1675px e mediu 911ms. A classe caia com 3px ainda por andar e o
// smooth morria no meio do caminho. Em pagina mais longa ou aparelho lento a
// sobra e maior ainda.
const TETO_SUAVE_MS = 2000;

// ---------------------------------------------------------------------------
// LINHA DE LEITURA — o criterio de qual ponto acende.
//
// A secao ativa e a que contem a "linha de leitura": uma horizontal imaginaria
// a LINHA_BASE da altura da tela. Ativo = ultima secao cujo topo ja passou por
// ela. E o mesmo criterio de "a qual secao eu cheguei", que e o que um indice
// de ancoras significa — e por isso clicar em 02 acende 02.
//
// O QUE ESTAVA ERRADO ANTES. A mecanica anterior usava IntersectionObserver
// com uma faixa de 45% a 55% da tela e pegava a PRIMEIRA secao que a cruzasse.
// Dois defeitos medidos:
//   - a secao 00 tem 360px numa tela de 823px, entao no topo da pagina a faixa
//     do meio ja cai dentro da secao 01: o ponto 00 NUNCA acendia;
//   - com duas secoes na faixa a troca so acontecia quando a de cima saia
//     inteira, entao o ponto ficava atrasado (3 divergencias em 23 amostras).
//
// POR QUE A LINHA DESLIZA NO FIM. A secao 04 comeca a 541px do fim do
// documento e a tela tem 823px: e IMPOSSIVEL rolar o topo dela ate uma linha
// fixa no alto da tela, porque a pagina acaba antes. Com linha fixa o ponto 04
// nunca acende (medido: falha em 390x844, 412x823, 412x915, 414x896, 430x932 e
// 430x1000). Entao, nos ultimos JANELA_FINAL de rolagem, a linha desce ate a
// borda de baixo: quando a pagina nao pode mais rolar, quem olha mais para
// baixo e a linha. No fim absoluto a linha esta no fim do documento, o que faz
// o ponto 04 acender sempre, em qualquer tela.
//
// OS DOIS NUMEROS saem de varredura contra a geometria REAL do site em 10
// viewports (320x640 ate 430x1000), exigindo tudo isto ao mesmo tempo:
//
//   A. no topo da pagina o ponto aceso e o 00
//   B. no fim da pagina o ponto aceso e o 04
//   C. clicar no ponto N deixa o ponto N aceso quando a rolagem terminar
//   D. o ponto nunca anda para tras enquanto se rola para baixo
//   E. todo ponto acende em algum trecho
//
// A regiao que cumpre as cinco e base 0.20..0.385 com janela ate ~0.15. Estes
// valores estao no CENTRO dela de proposito, e a folga e o que absorve mudanca
// de altura de secao: com base 0.30 sobram 63px de altura da secao 00 antes de
// o criterio A quebrar (com 0.35 sobrariam so 13px). Editou copy que muda a
// altura de alguma secao? Rode `node _simular-indice.mjs`, que refaz a
// varredura inteira contra o layout novo.
//
// A linha fica no ALTO da tela de proposito, e nao no meio: ela responde "a
// qual secao eu cheguei", nao "qual secao ocupa mais pixels". Sao coisas
// diferentes quando as secoes sao menores que a tela (aqui: 360 a 541px numa
// tela de 823px), e e a primeira que casa com o clique no indice.
//
// NAO subir LINHA_BASE para 0.5 "para ficar no meio da tela": e exatamente o
// que apagava o ponto 00.
const LINHA_BASE = 0.3;
const JANELA_FINAL = 0.12;

/** Indice da secao ativa para uma dada posicao de rolagem. */
function secaoAtiva(
  topos: number[],
  rolagem: number,
  tela: number,
  maximo: number,
) {
  // Pagina menor que a tela: nao ha rolagem, a primeira secao manda.
  if (maximo <= 0) return 0;

  const janela = tela * JANELA_FINAL;
  const restante = maximo - rolagem;
  const empurrao = Math.min(1, Math.max(0, (janela - restante) / janela));
  const linha = rolagem + tela * (LINHA_BASE + (1 - LINHA_BASE) * empurrao);

  let ativa = 0;
  for (let i = 0; i < topos.length; i++) if (topos[i] <= linha) ativa = i;
  return ativa;
}

export default function SectionIndex() {
  const [ativo, setAtivo] = useState(0);

  // Independente do gate de proposito: o ponto aceso e orientacao de
  // navegacao, nao decoracao, e precisa funcionar em aparelho reprovado.
  //
  // Le a geometria a cada quadro em vez de guardar cache DE PROPOSITO: o
  // acordeao da secao 02 muda a altura da pagina ao abrir, e cache aqui
  // deixaria o indice apontando para o lugar errado depois de um clique nele.
  // Sao cinco getBoundingClientRect por quadro, todos na mesma leitura de
  // layout. O rAF garante no maximo uma medicao por quadro, e o listener e
  // passive para nao segurar a rolagem.
  useEffect(() => {
    let pendente = 0;

    const medir = () => {
      pendente = 0;
      const raiz = document.documentElement;
      const rolagem = window.scrollY;
      const tela = raiz.clientHeight;
      const topos = SECOES.map((secao) => {
        const alvo = document.getElementById(secao.id);
        return alvo
          ? alvo.getBoundingClientRect().top + rolagem
          : Number.POSITIVE_INFINITY;
      });
      setAtivo(secaoAtiva(topos, rolagem, tela, raiz.scrollHeight - tela));
    };

    const agendar = () => {
      if (pendente) return;
      pendente = requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      if (pendente) cancelAnimationFrame(pendente);
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
    };
  }, []);

  // Guarda o encerramento da rolagem em andamento: um segundo clique antes de
  // a primeira terminar precisa cancelar o encerramento anterior, senao ele
  // arranca a classe no meio da rolagem nova.
  const encerrarRef = useRef<(() => void) | null>(null);

  // Rolagem interrompida no meio deixaria a classe pendurada no <html>.
  useEffect(() => () => encerrarRef.current?.(), []);

  const irPara = useCallback(
    (evento: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      evento.preventDefault();

      const alvo = document.getElementById(id);
      if (!alvo) return;

      const raiz = document.documentElement;
      const semAnimacao = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      encerrarRef.current?.();

      // A ancora de proposito NAO vai para a URL: com um fragmento gravado, o
      // navegador rolaria ate a secao no proximo recarregamento em vez de
      // abrir no topo — que e justamente o sintoma que esta correcao elimina.
      if (semAnimacao) {
        alvo.scrollIntoView({ block: "start" });
        return;
      }

      // A classe so existe durante a rolagem: deixa-la fixa faria o smooth
      // sequestrar de novo o carregamento da pagina.
      raiz.classList.add("scroll-suave");
      alvo.scrollIntoView({ block: "start" });

      let idTeto = 0;
      const encerrar = () => {
        raiz.classList.remove("scroll-suave");
        window.removeEventListener("scrollend", encerrar);
        window.clearTimeout(idTeto);
        encerrarRef.current = null;
      };

      window.addEventListener("scrollend", encerrar);
      idTeto = window.setTimeout(encerrar, TETO_SUAVE_MS);
      encerrarRef.current = encerrar;
    },
    [],
  );

  return (
    <nav
      aria-label="Índice de seções"
      className="idx-nav fixed top-1/2 z-30 flex -translate-y-1/2 flex-col gap-[14px]"
    >
      {/* Centro do ponto: 3,5px de meio ponto, agora que o link nao tem mais
          padding horizontal. Este 3px anda JUNTO com o px-[...] do <a> abaixo:
          era left-[13px] quando havia px-[10px].
          Os z-index sao o que mantem a linha ATRAS dos pontos: sem eles a
          ordem do DOM decide e a linha corta cada bolinha ao meio. */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-[3px] top-0 w-px bg-line"
        style={{ zIndex: 0 }}
      />
      {SECOES.map((secao, i) => (
        <a
          key={secao.id}
          href={`#${secao.id}`}
          onClick={(evento) => irPara(evento, secao.id)}
          aria-label={`Ir para a seção ${secao.num} — ${secao.titulo}`}
          // aria-current e o que informa a secao ativa a quem usa leitor de
          // tela. Antes o unico sinal de "voce esta aqui" era a cor do ponto,
          // que e invisivel para o leitor.
          aria-current={i === ativo ? "true" : undefined}
          // Concatenacao, e nao template literal, de proposito: o extrator de
          // classes do Tailwind v4 nao reconhece uma classe arbitraria colada
          // no `${` de uma interpolacao. O py-[15px] que existia aqui NUNCA
          // gerou CSS — o arquivo compilado tem py-[11px], py-[14px], py-[19px]
          // e py-[58px], e nenhum py-[15px]. O espacamento atual dos pontos e o
          // aprovado; fazer aquele py funcionar esticaria cada link de 14px
          // para 44px e espalharia os cinco pontos por mais 150px. A area de
          // toque de 24px que a WCAG 2.2 (SC 2.5.8) exige vem do
          // `.idx-nav a::after` no globals.css, que cresce sem deslocar nada.
          // NAO reintroduzir padding vertical aqui.
          className={
            "flex items-center gap-[9px]" +
            (i === ativo ? " ativo" : "")
          }
          style={{ position: "relative", zIndex: 1 }}
        >
          <span
            aria-hidden="true"
            className="idx-dot h-[7px] w-[7px] shrink-0 rounded-full border border-dim bg-raise"
          />
          <span
            aria-hidden="true"
            className="idx-num font-mono text-[9px] tracking-[.08em] text-dim"
          >
            {secao.num}
          </span>
        </a>
      ))}
    </nav>
  );
}
