import { RecipeImage } from "@/components/RecipeImage";

/** Gambar kecil resep dengan ukuran inline (aman walau kelas Tailwind belum ter-generate). */
export function Thumb({ name, src, width, height }: { name: string; src?: string; width: number; height: number }) {
  return (
    <span className="adm-thumb" style={{ width, height }}>
      <RecipeImage name={name} src={src} />
    </span>
  );
}
