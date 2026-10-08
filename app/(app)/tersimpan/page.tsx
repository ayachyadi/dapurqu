"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { RecipeGridCard } from "@/components/RecipeCard";
import { useRecipes } from "@/lib/recipes-context";

export default function TersimpanPage() {
  const { saved, recipes } = useRecipes();
  const mine = recipes.filter((r) => r.source === "ai" && !r.saved);
  return (
    <>
      <PageHeader title="Resep Tersimpan" subtitle={`${saved.length} resep`} />
      <div className="px-4">
        {saved.length === 0 ? (
          <div className="mt-10 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-50 text-primary-600">
              <Bookmark size={28} />
            </span>
            <p className="mt-4 text-[16px] font-extrabold text-ink">Belum ada resep tersimpan</p>
            <p className="mx-auto mt-1 max-w-[16rem] text-[13px] text-body">Ketuk ikon bookmark pada resep yang kamu suka agar mudah dicari lagi.</p>
            <Link href="/cari" className="mt-5 inline-block rounded-xl bg-primary-600 px-5 py-3 text-[14px] font-bold text-white">
              Jelajahi resep
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {saved.map((r) => (
              <RecipeGridCard key={r.id} r={r} />
            ))}
          </div>
        )}

        {mine.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 text-[16px] font-extrabold text-ink">Riwayat resep AI</h2>
            <div className="grid grid-cols-2 gap-3">
              {mine.map((r) => (
                <RecipeGridCard key={r.id} r={r} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
