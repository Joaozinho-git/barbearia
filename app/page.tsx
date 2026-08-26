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
        {/* A SOMA dos dois paddings e o numero que nao pode mudar: 52 + 40 =
            92px, os mesmos 92px do par 72/20 anterior. Por isso a coluna de
            texto continua com a MESMA largura em qualquer tela (560px no
            maximo de 652px) e nenhuma linha reflui — o bloco so andou 20px
            para a esquerda.

            A divisao deixou de ser 72/20 porque no celular aquilo botava 72px
            de vazio a esquerda contra 20px a direita, e o conteudo lia como
            empurrado para o canto direito. Com 52/40 a diferenca cai para
            12px e o bloco fica opticamente centrado, contando que o indice
            lateral e tinta fraca (cinco pontos de 7px) e nao pesa como
            margem.

            52px e o MINIMO com o indice no lugar: a caixa dele mede 28px a
            partir de left:16px, entao termina em x=44 e sobram 8px de
            respiro. Reduzir mais encosta o texto nos numeros. Se o max-w ou
            estes paddings mudarem, o 310px da .idx-nav no globals.css muda
            junto. */}
        <main className="mx-auto max-w-[652px] pl-[52px] pr-[40px]">
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
