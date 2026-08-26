import SectionIndex from "@/components/SectionIndex";
import MotionProbe from "@/components/MotionProbe";
import Reveal from "@/components/Reveal";
import Hero from "@/components/Hero";
import Equipe from "@/components/Equipe";
import Formacao from "@/components/Formacao";
import Localizacao from "@/components/Localizacao";
import Contato from "@/components/Contato";

export default function Home() {
  return (
    <>
      <MotionProbe />
      <Reveal />
      <SectionIndex />
      {/* Esta div existe por um motivo so: conter o vazamento horizontal das
          glows. Ela ocupa a largura da viewport e leva overflow-x: clip no
          globals.css — leia o comentario da .pagina la, que explica por que
          o corte nao pode morar no body, no html nem no proprio main.

          A SectionIndex fica FORA dela de proposito: caixa com overflow: clip
          recorta ate descendente position: fixed, e o indice sumiria. */}
      <div className="pagina">
        {/* 652 = 52px de calha do indice + 600px de coluna. O pl-[72px] e a
            soma da calha com o padding: mantem o conteudo em 560px, igual a
            antes da centralizacao. Se este max-w mudar, o 310px da .idx-nav
            no globals.css muda junto. */}
        <main className="mx-auto max-w-[652px] pl-[72px] pr-[20px]">
          <Hero />
          <Equipe />
          <Formacao />
          <Localizacao />
          <Contato />
        </main>
      </div>
    </>
  );
}
