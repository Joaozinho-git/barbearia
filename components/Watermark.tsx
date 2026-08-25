import Image from "next/image";

export default function Watermark() {
  return (
    <div className="marca-dagua" aria-hidden="true">
      <Image
        src="/logo-santos-dumont.png"
        alt=""
        width={1024}
        height={739}
        sizes="(max-width: 512px) calc(100vw - 92px), 420px"
        className="watermark"
      />
    </div>
  );
}
