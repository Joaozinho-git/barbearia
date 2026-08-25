"use client";

import { useEffect, useRef, useState } from "react";

const DURACAO_MS = 1200;

const formatar = (n: number) => String(n).padStart(2, "0");

export default function Contador({ valor }: { valor: string }) {
  // Começa no valor final: sem JS o número já está correto e a hidratação bate.
  const [texto, setTexto] = useState(valor);
  const [contando, setContando] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const alvo = ref.current;
    if (!alvo) return;
    if (!document.documentElement.classList.contains("motion-ok")) return;

    const final = Number(valor);
    if (!Number.isFinite(final)) return;

    let id = 0;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          observador.unobserve(entrada.target);

          const inicio = performance.now();

          // O quadro anterior, guardado aqui de proposito. A animacao dura
          // 1200ms e o rAF entrega ~72 quadros, mas a contagem ate 04 tem
          // apenas 5 valores possiveis, a de 06 tem 7 e a de 10 tem 11.
          // Chamar setTexto a cada quadro pedia ao React ~72 reconciliacoes
          // por contador — 216 nos tres — para produzir 23 mudancas de DOM.
          // Medido com MutationObserver: 23 mutacoes reais contra ~216
          // setState. Os ~193 restantes reconciliavam para chegar ao MESMO
          // texto que ja estava la.
          //
          // Comparar antes de avisar corta isso na origem: o React so e
          // acionado quando o numero de fato muda. O resultado na tela e
          // identico quadro a quadro — o que sai daqui e so trabalho que nao
          // produzia pixel nenhum.
          let ultimo = "";
          const passo = () => {
            const t = Math.min((performance.now() - inicio) / DURACAO_MS, 1);

            // Progressão linear, sem easing: numa contagem até 04 o
            // easeOutCubic concentrava o tempo entre 0 e 3 e espremia o salto
            // de 3 para 4 nos últimos 15%, que era o único quadro percebido.
            // Linear dá fatia igual a cada valor. NÃO reintroduzir easing.
            if (t < 1) {
              const proximo = formatar(Math.round(final * t));
              if (proximo !== ultimo) {
                ultimo = proximo;
                setTexto(proximo);
              }
              id = requestAnimationFrame(passo);
              return;
            }

            setTexto(valor);
            setContando(false);
          };

          ultimo = formatar(0);
          setTexto(ultimo);
          setContando(true);
          id = requestAnimationFrame(passo);
        }
      },
      { threshold: 0.35 },
    );

    // Os três contadores observam a MESMA faixa, não cada um a si próprio:
    // é o que garante que disparem no mesmo quadro e terminem juntos.
    observador.observe(alvo.closest(".nums-faixa") ?? alvo);

    return () => {
      observador.disconnect();
      cancelAnimationFrame(id);
    };
  }, [valor]);

  // O desfoque não é enfeite: contar até 04 tem só cinco estados, e nenhuma
  // duração isolada torna isso perceptível. Ele dá peso ao movimento sem
  // alongar o tempo artificialmente.
  return (
    <span ref={ref} className={contando ? "contando" : undefined}>
      {texto}
    </span>
  );
}
