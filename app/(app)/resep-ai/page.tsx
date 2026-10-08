"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, Search, Sparkles, X } from "lucide-react";
import { Button, Notice, PageHeader, Panel } from "@/components/ui";
import { NeedKey } from "@/components/NeedKey";
import { RecipeView } from "@/components/RecipeView";
import { useAi } from "@/lib/ai-context";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/lib/recipes-context";
import { AiError, generateRecipe } from "@/lib/gemini";
import type { Recipe } from "@/lib/types";

function ResepAiInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { settings, hasKey } = useAi();
  const { profile } = useAuth();
  const { addGenerated } = useRecipes();
  const [menu, setMenu] = useState(params.get("menu") ?? "");
  const [servings, setServings] = useState(profile?.defaultServings ?? 4);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<Recipe | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (profile?.defaultServings) setServings(profile.defaultServings);
  }, [profile?.defaultServings]);
  useEffect(() => () => abort.current?.abort(), []);

  async function generate() {
    const name = menu.trim();
    if (!name) return setErr("Tulis dulu nama menunya.");
    setLoading(true);
    setErr("");
    setResult(null);
    abort.current?.abort();
    abort.current = new AbortController();
    try {
      const r = await generateRecipe(settings, name, servings, undefined, abort.current.signal);
      setResult(await addGenerated(r));
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr(e instanceof AiError ? e.message : "Gagal membuat resep. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="AI Generator Resep" subtitle="Ketik menu, dapatkan bahan dan cara masaknya" onBack={() => router.back()} />
      <div className="space-y-4 px-4">
        {!hasKey && <NeedKey />}

        <Panel>
          <p className="mb-2 text-[13px] font-extrabold text-ink">Menu yang Ingin Dibuat</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generate();
            }}
            className="space-y-3"
          >
            <label className="flex items-center gap-2.5 rounded-xl bg-sunken px-3 py-3 ring-1 ring-transparent focus-within:bg-white focus-within:ring-primary-600">
              <Search size={17} className="text-primary-600" />
              <input value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="Contoh: Nasi goreng kampung" className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted" enterKeyHint="go" />
              {menu && (
                <button type="button" onClick={() => setMenu("")} aria-label="Hapus" className="grid h-5 w-5 place-items-center rounded-full bg-sunken-2">
                  <X size={12} />
                </button>
              )}
            </label>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-ink">Untuk berapa porsi</span>
              <div className="inline-flex items-center gap-3 rounded-xl bg-sunken px-2 py-1.5">
                <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Kurangi" className="grid h-8 w-8 place-items-center rounded-lg bg-white text-primary-600">
                  <Minus size={16} />
                </button>
                <b className="min-w-[3.5rem] text-center text-[14px]">{servings} porsi</b>
                <button type="button" onClick={() => setServings((s) => Math.min(20, s + 1))} aria-label="Tambah" className="grid h-8 w-8 place-items-center rounded-lg bg-white text-primary-600">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <Button type="submit" full loading={loading} disabled={!hasKey}>
              {!loading && <Sparkles size={17} />} Generate Resep AI
            </Button>
          </form>
        </Panel>

        {err && <Notice tone="error">{err}</Notice>}

        {loading && (
          <div className="space-y-3">
            <div className="skeleton aspect-[16/10] rounded-3xl" />
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-40 rounded-3xl" />
          </div>
        )}

        {result && <RecipeView recipe={result} />}
      </div>
    </>
  );
}

export default function ResepAiPage() {
  return (
    <Suspense fallback={null}>
      <ResepAiInner />
    </Suspense>
  );
}
