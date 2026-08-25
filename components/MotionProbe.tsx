"use client";

import { useEffect } from "react";

const JANELA_MS = 400;
const FPS_MINIMO = 50;
// Duas janelas ruins seguidas para reprovar. Numa janela de 400ms a 60Hz cabem
// ~24 quadros, entao cada quadro perdido custa ~2,5 FPS e sobram so 4 quadros
// de margem ate o limiar: uma unica janela nao distingue aparelho fraco de
// engasgo passageiro.
const JANELAS_RUINS = 2;
// Folga depois do load para o navegador terminar o que ficou pendurado no fim
// do carregamento (decode de imagem, ultimo layout) antes da primeira medicao.
const FOLGA_MS = 200;

export default function MotionProbe() {
  useEffect(() => {
    const raiz = document.documentElement;
    if (!raiz.classList.contains("motion-ok")) return;

    // A medicao NAO pode acontecer na montagem. Ali ela cai exatamente em cima
    // da hidratacao, do display:swap das tres fontes e do decode do aviao
    // priority — e reprova aparelho saudavel. O perfil de falha era o pior
    // possivel: falhava no carregamento frio (visitante novo) e passava no
    // recarregamento quente (quem estava testando). Medir depois do load
    // avalia o aparelho em regime, que e o que interessa.
    let idQuadro = 0;
    let idOcioso = 0;
    let idFolga = 0;
    let ruins = 0;
    let cancelado = false;

    const medirJanela = () => {
      let quadros = 0;
      const inicio = performance.now();

      const passo = () => {
        if (cancelado) return;
        quadros++;
        const decorrido = performance.now() - inicio;

        if (decorrido < JANELA_MS) {
          idQuadro = requestAnimationFrame(passo);
          return;
        }

        const fps = quadros / (decorrido / 1000);
        if (fps >= FPS_MINIMO) return; // aparelho da conta: para de medir

        ruins++;
        if (ruins >= JANELAS_RUINS) {
          raiz.classList.remove("motion-ok");
          return;
        }
        idQuadro = requestAnimationFrame(medirJanela);
      };

      idQuadro = requestAnimationFrame(passo);
    };

    // requestIdleCallback nao existe no Safari antigo; o setTimeout cobre.
    // Chamado como window.x(...) de proposito: a referencia solta lanca
    // "Illegal invocation" em alguns navegadores.
    const temOcioso = typeof window.requestIdleCallback === "function";

    const agendar = () => {
      if (cancelado) return;
      idOcioso = temOcioso
        ? window.requestIdleCallback(medirJanela, { timeout: 2000 })
        : window.setTimeout(medirJanela, 0);
    };

    const aposLoad = () => {
      idFolga = window.setTimeout(agendar, FOLGA_MS);
    };

    if (document.readyState === "complete") aposLoad();
    else window.addEventListener("load", aposLoad, { once: true });

    return () => {
      cancelado = true;
      window.removeEventListener("load", aposLoad);
      window.clearTimeout(idFolga);
      cancelAnimationFrame(idQuadro);
      if (idOcioso) {
        if (temOcioso) window.cancelIdleCallback(idOcioso);
        else window.clearTimeout(idOcioso);
      }
    };
  }, []);

  return null;
}
