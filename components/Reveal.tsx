"use client";

import { useEffect } from "react";

export default function Reveal() {
  useEffect(() => {
    // Marca de hidratacao lida pelo failsafe do GATE (app/layout.tsx). Fica
    // ANTES da checagem do gate de proposito: o failsafe existe para o caso de
    // este chunk nunca chegar, entao a marca precisa ser gravada sempre que ele
    // chega — inclusive em aparelho reprovado, onde nao ha nada a revelar.
    document.documentElement.dataset.hidratado = "1";

    if (!document.documentElement.classList.contains("motion-ok")) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          entrada.target.classList.add("in-view");
          observador.unobserve(entrada.target);
        }
      },
      { threshold: 0.2 },
    );

    document
      .querySelectorAll(".reveal, .cut")
      .forEach((alvo) => observador.observe(alvo));

    return () => observador.disconnect();
  }, []);

  return null;
}
