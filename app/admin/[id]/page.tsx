"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { RecipeEditor } from "@/components/admin/RecipeEditor";
import { Spinner } from "@/components/ui";
import { useAllCatalog } from "@/lib/admin";

export default function AdminEdit() {
  const { id } = useParams<{ id: string }>();
  const { items, loading } = useAllCatalog(true);

  if (loading) {
    return (
      <>
        <AdminHeader />
        <div className="grid place-items-center py-24 text-muted"><Spinner className="h-6 w-6" /></div>
      </>
    );
  }

  const ids = new Set(items.map((r) => r.id));
  if (id === "baru") return <RecipeEditor existingIds={ids} />;

  const recipe = items.find((r) => r.id === id);
  if (!recipe) {
    return (
      <>
        <AdminHeader />
        <main className="mx-auto max-w-xl px-6 py-20 text-center">
          <h1 className="text-xl font-extrabold">Resep tidak ditemukan</h1>
          <p className="mt-2 text-[14px] text-body">Mungkin sudah dihapus, atau resep bawaan belum diimpor ke katalog.</p>
          <Link href="/admin" className="mt-5 inline-block font-extrabold text-primary-600">Kembali ke daftar</Link>
        </main>
      </>
    );
  }
  return <RecipeEditor key={recipe.id} recipe={recipe} existingIds={ids} />;
}
