import { cn } from "@/lib/utils";

/** Ikon aplikasi DapurQu (latar cokelat, tanda putih). Sudut dibulatkan lewat CSS. */
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/dapurqu-icon-256.png"
      width={size}
      height={size}
      alt="DapurQu"
      draggable={false}
      className={cn("shrink-0 select-none", className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.24) }}
    />
  );
}

/** Tanda putih transparan, dipakai di atas latar cokelat (splash). */
export function LogoMark({ width = 160, className }: { width?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/mark-white.png" width={width} alt="DapurQu" draggable={false} className={cn("select-none", className)} style={{ width, height: "auto" }} />
  );
}
