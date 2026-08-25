"use client";

import { useEffect, useRef, useState } from "react";
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

// Faixa central de 10% da tela: a seção só conta como ativa ao cruzar o meio.
const FAIXA_CENTRAL = "-45% 0px -45% 0px";

export default function SectionIndex() {
  const [ativo, setAtivo] = useState<string>(SECOES[0].id);

  // Independente do gate de propósito: o ponto ativo é orientação de
  // navegação, não decoração, e precisa funcionar em aparelho reprovado.
  useEffect(() => {
    const visiveis = new Set<string>();

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) visiveis.add(entrada.target.id);
          else visiveis.delete(entrada.target.id);
        }

        const primeira = SECOES.find((secao) => visiveis.has(secao.id));
        if (primeira) setAtivo(primeira.id);
      },
      { rootMargin: FAIXA_CENTRAL },
    );

    for (const secao of SECOES) {
      const alvo = document.getElementById(secao.id);
      if (alvo) observador.observe(alvo);
    }

    return () => observador.disconnect();
  }, []);

  // Guarda o encerramento da rolagem em andamento: um segundo clique antes de
  // a primeira terminar precisa cancelar o encerramento anterior, senao ele
  // arranca a classe no meio da rolagem nova.
  const encerrarRef = useRef<(() => void) | null>(null);

  // Rolagem interrompida no meio deixaria a classe pendurada no <html>.
  useEffect(() => () => encerrarRef.current?.(), []);

  const irPara = (evento: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    evento.preventDefault();

    const alvo = document.getElementById(id);
    if (!alvo) return;

    const raiz = document.documentElement;
    const semAnimacao = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    encerrarRef.current?.();

    // A âncora de propósito NÃO vai para a URL: com um fragmento gravado, o
    // navegador rolaria até a seção no próximo recarregamento em vez de abrir
    // no topo — que é justamente o sintoma que esta correção elimina.
    if (semAnimacao) {
      alvo.scrollIntoView({ block: "start" });
      return;
    }

    // A classe só existe durante a rolagem: deixá-la fixa faria o smooth
    // sequestrar de novo o carregamento da página.
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
  };

  return (
    <nav
      aria-label="Índice de seções"
      className="idx-nav fixed top-1/2 z-30 flex -translate-y-1/2 flex-col gap-[14px]"
    >
      {/* Centro do ponto: 10px de padding + 3.5px de meio ponto = 13.5px.
          Os z-index são o que mantém a linha ATRÁS dos pontos: sem eles a
          ordem do DOM decide e a linha corta cada bolinha ao meio. */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-[13px] top-0 w-px bg-line"
        style={{ zIndex: 0 }}
      />
      {SECOES.map((secao) => (
        <a
          key={secao.id}
          href={`#${secao.id}`}
          onClick={(evento) => irPara(evento, secao.id)}
          aria-label={`Ir para a seção ${secao.num} — ${secao.titulo}`}
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
            "flex items-center gap-[9px] px-[10px]" +
            (secao.id === ativo ? " ativo" : "")
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
