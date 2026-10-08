"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Flame, Plus, Search, Sparkles, X, Refrigerator, ArrowRight } from "lucide-react";
import { Badge, Button, Notice, PageHeader, Panel, Spinner } from "@/components/ui";
import { RecipeImage } from "@/components/RecipeImage";
import { NeedKey } from "@/components/NeedKey";
import { useAi } from "@/lib/ai-context";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/lib/recipes-context";
import { AiError, generateRecipe, suggestMenus, type SuggestedMenu } from "@/lib/gemini";
import { QUICK_PANTRY } from "@/lib/seed";
import type { Origin } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";

const PANTRY_KEY = "dapurqu.pantry.v1";

export default function AiMasakPage() {
  const router = useRouter();
  const { settings, hasKey } = useAi();
  const { profile } = useAuth();
  const { addGenerated } = useRecipes();
  const [pantry, setPantry] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [cuisine, setCuisine] = useState<Origin>("Lokal");
  const [loading, setLoading] = useState(false);
  const [openingIdx, setOpeningIdx] = useState<number | null>(null);
  const [menus, setMenus] = useState<SuggestedMenu[] | null>(null);
  const [err, setErr] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PANTRY_KEY);
      if (raw) setPantry(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (profile?.cuisinePref === "Luar") setCuisine("Luar");
  }, [profile?.cuisinePref]);

  useEffect(() => () => abort.current?.abort(), []);

  function persist(next: string[]) {
    setPantry(next);
    try {
      localStorage.setItem(PANTRY_KEY, JSON.stringify(next));
    } catch {}
  }

  function add(raw: string) {
    const parts = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...pantry];
    for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
    persist(next);
    setText("");
  }

  async function generate() {
    if (!pantry.length) return setErr("Tambahkan minimal satu bahan dulu.");
    setLoading(true);
    setErr("");
    setMenus(null);
    abort.current?.abort();
    abort.current = new AbortController();
    try {
      setMenus(await suggestMenus(settings, pantry, cuisine, abort.current.signal));
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr(e instanceof AiError ? e.message : "Gagal membuat rekomendasi. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function open(m: SuggestedMenu, idx: number) {
    setOpeningIdx(idx);
    setErr("");
    try {
      const r = await generateRecipe(settings, m.name, profile?.defaultServings ?? 4, { origin: cuisine });
      const saved = await addGenerated(r);
      router.push(`/resep/${saved.id}`);
    } catch (e) {
      setErr(e instanceof AiError ? e.message : "Gagal membuat resep. Coba lagi.");
      setOpeningIdx(null);
    }
  }

  return (
    <>
      <PageHeader title="AI Masak dari Bahan" subtitle="Masukkan bahan yang ada di kulkasmu" onBack={() => router.back()} />
      <div className="space-y-4 px-4">
        {!hasKey && <NeedKey />}

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-100 text-primary-600">
                <Refrigerator size={18} />
              </span>
              <h2 className="text-[15px] font-extrabold">Pantry dan Kulkas Anda</h2>
            </div>
            {pantry.length > 0 && <Badge tone="light" className="bg-secondary-100 !text-secondary-700">{pantry.length} Bahan Siap</Badge>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              add(text);
            }}
            className="flex gap-2"
          >
            <label className="flex flex-1 items-center gap-2 rounded-xl bg-sunken px-3 py-3 ring-1 ring-transparent focus-within:bg-white focus-within:ring-primary-600">
              <Search size={17} className="text-muted" />
              <input value={text} onChange={(e) => setText(e.target.value)} onBlur={() => add(text)} placeholder="Ketik bahan lalu tekan Enter..." className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted" enterKeyHint="done" />
            </label>
            <button type="submit" aria-label="Tambah bahan" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700 active:bg-primary-200">
              <Plus size={20} />
            </button>
          </form>

          {pantry.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[12px]">
                <span className="font-bold text-ink">Bahan terpilih saat ini:</span>
                <button onClick={() => persist([])} className="font-extrabold text-primary-600">Hapus Semua</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {pantry.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 py-1.5 pl-2.5 pr-2 text-[13px] font-bold text-primary-800">
                    <Check size={13} />
                    {p}
                    <button onClick={() => persist(pantry.filter((x) => x !== p))} aria-label={`Hapus ${p}`} className="grid h-4 w-4 place-items-center rounded-full">
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-[12px] text-body">Saran bahan cepat di dapur:</p>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {QUICK_PANTRY.filter((q) => !pantry.some((p) => p.toLowerCase() === q.toLowerCase())).map((q) => (
                <button key={q} onClick={() => add(q)} className="shrink-0 rounded-full bg-sunken px-3 py-1.5 text-[12px] font-bold text-body active:bg-sunken-2">
                  + {q}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <section>
          <h2 className="mb-2 text-[14px] font-extrabold text-ink">Pilihan Selera Masakan</h2>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { k: "Lokal", flag: "🇮🇩", title: "Masakan Lokal", sub: "Nusantara, Gurih, Rumahan" },
                { k: "Luar", flag: "🌍", title: "Masakan Luar", sub: "Western, Asian, Italian" },
              ] as const
            ).map((o) => (
              <button key={o.k} onClick={() => setCuisine(o.k)} className={cn("relative rounded-2xl bg-white p-4 text-left ring-1 transition", cuisine === o.k ? "ring-2 ring-primary-600" : "ring-line")}>
                <span className={cn("absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full border-2", cuisine === o.k ? "border-primary-600 bg-primary-600 text-white" : "border-line")}>
                  {cuisine === o.k && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="text-2xl">{o.flag}</span>
                <p className="mt-2 text-[14px] font-extrabold text-ink">{o.title}</p>
                <p className="text-[11px] text-muted">{o.sub}</p>
              </button>
            ))}
          </div>
        </section>

        <Button full onClick={generate} loading={loading} disabled={!hasKey || pantry.length === 0}>
          {!loading && <Sparkles size={17} />} Buat Rekomendasi Menu AI
        </Button>

        {err && <Notice tone="error">{err}</Notice>}

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-56 rounded-3xl" />
            ))}
          </div>
        )}

        {menus && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-100 px-3 py-1.5 text-[12px] font-bold text-secondary-700">
                <Check size={13} /> Ditemukan {menus.length} menu cocok
              </span>
              <span className="text-[11px] text-muted">Saran AI, belum dicek</span>
            </div>
            {menus.map((m, i) => (
              <div key={`${m.name}-${i}`} className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_14px_-6px_rgba(60,40,20,0.2)] ring-1 ring-line/70">
                <div className="relative aspect-[16/9]">
                  <RecipeImage name={m.name} />
                  <Badge tone="dark" className="absolute bottom-3 left-3">
                    <Clock size={12} /> {formatTime(m.timeMinutes)}
                  </Badge>
                  {m.missing.length === 0 ? (
                    <span className="absolute bottom-3 right-3 rounded-lg bg-secondary-200 px-2.5 py-1 text-[11px] font-extrabold text-secondary-700">Semua bahan tersedia!</span>
                  ) : (
                    <span className="absolute bottom-3 right-3 max-w-[60%] truncate rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-extrabold text-ink">Tinggal tambah: {m.missing.join(", ")}</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-[16px] font-extrabold text-ink">{m.name}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-body">{m.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-secondary-600">
                      <Flame size={14} /> Level: {m.level}
                    </span>
                    <button onClick={() => open(m, i)} disabled={openingIdx !== null} className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60 active:bg-primary-700">
                      {openingIdx === i ? <Spinner className="h-3.5 w-3.5" /> : null}
                      Lihat Cara Masak {openingIdx === i ? null : <ArrowRight size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
