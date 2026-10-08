"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { RecipeView } from "@/components/RecipeView";
import { useRecipes } from "@/lib/recipes-context";

export default function ResepPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getRecipe, ready, removeGenerated } = useRecipes();
  const recipe = getRecipe(id);

  if (!recipe) {
    return (
      <>
        <PageHeader title="Resep" onBack={() => router.back()} />
        <div className="px-4">
          {!ready ? (
            <div className="skeleton aspect-[16/10] rounded-3xl" />
          ) : (
            <div className="mt-10 text-center">
              <p className="text-[16px] font-extrabold">Resep tidak ditemukan</p>
              <Link href="/cari" className="mt-4 inline-block font-bold text-primary-600">Cari resep lain</Link>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={recipe.name}
        subtitle={recipe.source === "ai" ? "Dibuat oleh AI" : "Resep bawaan"}
        onBack={() => router.back()}
        right={
          recipe.source === "ai" ? (
            <button
              aria-label="Hapus resep"
              onClick={async () => {
                if (confirm("Hapus resep AI ini?")) {
                  await removeGenerated(recipe.id);
                  router.replace("/");
                }
              }}
              className="grid h-10 w-10 place-items-center rounded-full bg-white text-danger ring-1 ring-line"
            >
              <Trash2 size={18} />
            </button>
          ) : null
        }
      />
      <div className="px-4">
        <RecipeView recipe={recipe} />
      </div>
    </>
  );
}
