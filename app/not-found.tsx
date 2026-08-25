import type { Metadata } from "next";
import Link from "next/link";
import { LINKS, NEGOCIO } from "@/lib/dados";

// Sem esta rota o visitante que erra a URL recebe o 404 padrao do Next, que e
// em ingles dentro de um documento declarado lang="pt-BR".
export const metadata: Metadata = {
  title: "Página não encontrada — Santos Dumont Barbearia",
  robots: { index: false, follow: true },
};

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-[100svh] max-w-[652px] flex-col justify-center px-[20px] py-[64px]">
      <p className="font-mono text-[9.5px] uppercase tracking-[.2em] text-wood-lt">
        Erro 404
      </p>

      <h1 className="mt-[14px] font-display text-[clamp(24px,7vw,32px)] font-bold uppercase leading-[1.1] text-ink">
        Página não encontrada
      </h1>

      <p className="mt-[16px] max-w-[40ch] text-[13px] leading-[1.72] text-muted">
        O endereço que você abriu não existe aqui. A {NEGOCIO.nome} continua no
        mesmo lugar, em {NEGOCIO.cidade}.
      </p>

      <div className="mt-[32px] flex flex-wrap items-center gap-[16px]">
        <Link
          href="/"
          className="border-pole inline-flex h-[46px] items-center px-[22px] font-sans text-[13px] font-semibold uppercase tracking-[.06em] text-wood-lt hover:bg-[rgba(255,255,255,.06)] hover:text-ink"
        >
          Voltar ao início
        </Link>

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
