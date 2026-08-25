"use client";

import { useEffect } from "react";
import { LINKS, NEGOCIO } from "@/lib/dados";

// "use client" e obrigatorio: um error boundary precisa de estado no
// navegador. Sem este arquivo, qualquer excecao de componente cliente entrega
// tela branca ao visitante — sem texto, sem link, sem saida.
export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // O digest e a unica pista que sobra em producao: a mensagem real fica no
    // servidor, e sem ele nao da para ligar o relato do cliente ao log.
    console.error("Falha na página:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-[652px] flex-col justify-center px-[20px] py-[64px]">
      <p className="font-mono text-[9.5px] uppercase tracking-[.2em] text-wood-lt">
        Algo deu errado
      </p>

      <h1 className="mt-[14px] font-display text-[clamp(24px,7vw,32px)] font-bold uppercase leading-[1.1] text-ink">
        A página falhou
      </h1>

      <p className="mt-[16px] max-w-[40ch] text-[13px] leading-[1.72] text-muted">
        Tente de novo. Se continuar assim, fale com a {NEGOCIO.nome} pelo
        WhatsApp — o agendamento e o atendimento seguem normalmente.
      </p>

      <div className="mt-[32px] flex flex-wrap items-center gap-[16px]">
        <button
          type="button"
          onClick={reset}
          className="border-pole inline-flex h-[46px] cursor-pointer items-center px-[22px] font-sans text-[13px] font-semibold uppercase tracking-[.06em] text-wood-lt hover:bg-[rgba(255,255,255,.06)] hover:text-ink"
        >
          Tentar de novo
        </button>

        <a
          href={LINKS.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9.5px] uppercase tracking-[.13em] text-dim hover:text-ink"
        >
          Falar no WhatsApp ↗
        </a>
      </div>
    </main>
  );
}
