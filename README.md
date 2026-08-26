# Santos Dumont Barbearia — site

Site institucional de página única da Santos Dumont Barbearia, em Vacaria/RS.
Cinco seções, sem backend, sem formulário, sem autenticação.

**Next.js 16.3.1** (App Router, Turbopack, rota estática) · **React 19.2.8** ·
**Tailwind CSS v4** · **TypeScript 5.9**

---

## As duas regras do projeto

### 1. O site é para CELULAR

O alvo real é **320–430px** de largura. Desktop é irrelevante. Um problema que
só aparece acima de 480px não é bug aqui.

### 2. O visual está aprovado e é final

**Nenhuma alteração pode mover um pixel do estado de repouso.** A prova não é
inspeção visual, é pixel-diff:

```bash
npx next build && npx next start -p 3222
node _comparar-visual.mjs capturar antes     # ANTES de editar
# ...edita, npx next build, reinicia o servidor...
node _comparar-visual.mjs capturar depois
node _comparar-visual.mjs comparar antes depois   # tem que dar "TUDO IDENTICO"
```

Sempre contra `next start`, **nunca** contra `next dev`: o dev serve 792 KB de
script contra 140 KB da produção, e qualquer número medido ali é ficção.

**O ponto cego desta prova:** o `_comparar-visual.mjs` captura em
`mobile:false`, e existe bug que só aparece em `mobile:true` — foi assim que o
índice lateral ficou no meio da tela em produção com a suíte dando "TUDO
IDENTICO". Pixel-diff limpo não é prova de que está certo no celular; é prova
de que nada mudou. Para o resto, `node _testar-correcoes.mjs`.

E "0 pixels" não é lei da natureza: **corrigir o vazamento horizontal muda 483
pixels** nos números do índice, porque o texto volta a ter antialiasing de
subpixel quando a `.idx-nav` deixa de ser promovida a camada composta. Está
tudo registrado no comentário da `.pagina` em `app/globals.css`, com o shim que
reproduz. Diferença medida e explicada não é motivo para reverter.

---

## Rodar localmente

```bash
npm install
npm run dev
```

Produção, que é onde se mede:

```bash
npm run build
npm start -- -p 3222
```

Verificações:

```bash
npx tsc --noEmit && npx eslint . && npx next build
```

---

## Deploy na Vercel

### Variável de ambiente obrigatória

Antes do primeiro deploy, definir em **Settings → Environment Variables**:

| Variável | Valor | Ambiente |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://seudominio.com.br` | Production |

**Com `https://` na frente.** Sem o esquema, o `new URL()` do `metadataBase`
lança exceção e o build falha.

Essa variável alimenta o `canonical`, o `og:url`, o `og:image`, o `@id` e a
`url` do JSON-LD, o `Host` do `robots.txt` e o `<loc>` do `sitemap.xml`. Sem
ela o fallback é `VERCEL_PROJECT_PRODUCTION_URL` e, na ausência dos dois,
`http://localhost:3000` — que é exatamente o que o Google indexaria.

### O valor é resolvido em BUILD TIME

A rota `/` é estática. Trocar a variável na Vercel **não muda o HTML já
publicado**: é preciso republicar (Deployments → Redeploy).

### O que já está configurado

- **Cabeçalhos de segurança** em `next.config.ts`: `X-Content-Type-Options`,
  `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, e
  `poweredByHeader: false`. A Vercel aplica os `headers()` normalmente.
- **Sem Content-Security-Policy**, de propósito. A razão está comentada no
  `next.config.ts` — não adicionar uma no automático sem ler.
- **Otimização de imagem** pelo `next/image`, servida pelo otimizador da
  Vercel (entra na cota do plano).
- `robots.txt` e `sitemap.xml` gerados pelas convenções de arquivo do Next.

---

## Arquitetura: o que quebra se mexerem

### `motion-ok` controla CONTEÚDO, não só animação

Enquanto a classe `motion-ok` existe no `<html>`, a regra
`.motion-ok .reveal { opacity: 0 }` esconde **17 blocos de conteúdo**. Quem
devolve `opacity: 1` é o componente cliente `Reveal`.

Três coisas removem a classe:

1. o script inline `GATE` do `app/layout.tsx` (reduced-motion, `deviceMemory < 2`,
   `hardwareConcurrency < 4`, rede 2g);
2. o `MotionProbe`, quando mede FPS baixo;
3. um **failsafe de 2500ms** dentro do próprio GATE, que checa
   `document.documentElement.dataset.hidratado`.

O failsafe existe porque, sem ele, qualquer coisa que impeça o chunk de JS de
chegar — rede instável, chunk 404 pós-deploy, extensão de navegador — deixa o
hero intacto e as seções 01 a 04 **em branco**. O `<noscript>` não cobre esse
caso: o JavaScript está habilitado, só não chegou.

Ao mexer em `Reveal`, `MotionProbe`, no `GATE` ou no CSS de `.reveal`, trate os
quatro como um bloco atômico. E teste bloqueando `*/_next/static/chunks/*.js` —
**nunca** `chunks/*`, porque o CSS compilado mora lá e bloqueá-lo mascara o bug.

---

## Ferramentas de medição

| Arquivo | O que faz |
|---|---|
| `_comparar-visual.mjs` | Prova da Regra 2. Captura 320/390/430px com acordeões fechados e abertos e compara pixel a pixel. Determinístico: duas execuções seguidas dão arquivos idênticos. `LARGURAS_MEDICAO="700,1280"` troca as larguras — use quando a mudança puder afetar acima de 652px, onde o `main` deixa de ocupar a viewport inteira. |
| `_testar-correcoes.mjs` | **Roda em `mobile:true`, que é o modo que o `_comparar-visual.mjs` evita de propósito.** Mede viewport de layout, `scrollWidth`, posição do índice e o excedente vertical das glows, em 412 e 768. Obrigatório para qualquer mexida em `overflow`, na `.pagina` ou na `.idx-nav`: o bug do índice fora do lugar **só existe neste modo**. |
| `_medir-viewport.mjs` | Diagnóstico rápido do vazamento horizontal e da posição do índice, nos dois modos de emulação. `COM_MOVIMENTO=1` mede com as animações ativas. |
| `_provar-celular.mjs` | Captura a tela do celular (412×823, `mobile:true`) com e sem o vazamento, lado a lado. |
| `_medir-secao02.mjs` | Geometria e contraste da seção 02. Precisa de `URL_MEDICAO` apontando para a porta de produção. |
| `_gerar-imagens.mjs` | Gera `og-santos-dumont.png` (1200×630), `app/icon.png` (256×256) e `app/apple-icon.png` (180×180) a partir de `public/logo-santos-dumont.png`. **Sobrescreve os três de uma vez** — rodar só quando for regerar todos. |

As capturas vão para `_visual/`, que está no `.gitignore`.
