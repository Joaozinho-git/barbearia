export default function SectionHeader({
  num,
  titulo,
  className,
  style,
  children,
}: {
  num: string;
  titulo: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    // Concatenacao, e nao template literal: o extrator do Tailwind v4 nao
    // reconhece classe arbitraria colada no `${` de uma interpolacao. O
    // gap-[9px] daqui so aparecia no CSS por carona no Contato.tsx, que usa a
    // mesma classe em string literal — apagar aquele uso quebraria o
    // espacamento de TODOS os cabecalhos de secao, sem erro nenhum avisando.
    <div
      className={
        "mb-[18px] flex items-center gap-[9px]" +
        (className ? ` ${className}` : "")
      }
      style={style}
    >
      <span className="shrink-0 text-dim [&>svg]:block [&>svg]:h-[13px] [&>svg]:w-[13px]">
        {children}
      </span>
      <span className="font-mono text-[9.5px] tracking-[.1em] text-wood-lt">
        {num}
      </span>
      <span className="font-mono text-[9.5px] uppercase tracking-[.22em] text-muted">
        {titulo}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
