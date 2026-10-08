import { cn, hashString } from "@/lib/utils";

const PALETTES = [
  ["#e9cfb4", "#c9a07c"],
  ["#dccdb8", "#b59a78"],
  ["#e6d3c0", "#c4906a"],
  ["#d9d2c1", "#a89c82"],
  ["#ecd5bd", "#cf9f77"],
  ["#d8cfc4", "#9d8a77"],
];

/** Placeholder foto menu: blok netral hangat tanpa ikon. Foto asli tampil jika imageUrl ada. */
export function RecipeImage({ name, src, className }: { name: string; src?: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} loading="lazy" className={cn("h-full w-full object-cover", className)} />;
  }
  const [a, b] = PALETTES[hashString(name) % PALETTES.length];
  return (
    <div
      role="img"
      aria-label={`Foto ${name} belum ada`}
      className={cn("h-full w-full", className)}
      style={{
        background: `radial-gradient(120% 90% at 20% 15%, ${a} 0%, transparent 60%), radial-gradient(100% 80% at 85% 95%, ${b} 0%, transparent 65%), linear-gradient(135deg, ${a}, ${b})`,
      }}
    />
  );
}
