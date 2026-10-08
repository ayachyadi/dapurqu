"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X, Sparkles } from "lucide-react";
import { PageHeader, Chip, Panel } from "@/components/ui";
import { RecipeListCard } from "@/components/RecipeCard";
import { useRecipes } from "@/lib/recipes-context";
import { CATEGORIES } from "@/lib/types";

type Time = "all" | "fast" | "mid" | "long";
type Sort = "baru" | "cepat" | "nama";

function CariInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { recipes } = useRecipes();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState<string>("Semua");
  const [origin, setOrigin] = useState<"Semua" | "Lokal" | "Luar">("Semua");
  const [time, setTime] = useState<Time>("all");
  const [sort, setSort] = useState<Sort>("baru");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = recipes.filter((r) => {
      if (cat !== "Semua" && r.category !== cat) return false;
      if (origin !== "Semua" && r.origin !== origin) return false;
      if (time === "fast" && r.timeMinutes >= 15) return false;
      if (time === "mid" && (r.timeMinutes < 15 || r.timeMinutes > 30)) return false;
      if (time === "long" && r.timeMinutes <= 30) return false;
      if (!term) return true;
      const hay = `${r.name} ${r.description} ${r.category} ${r.origin} ${r.ingredients.map((i) => i.item).join(" ")}`.toLowerCase();
      return term.split(/\s+/).every((t) => hay.includes(t));
    });
    if (sort === "cepat") out.sort((a, b) => a.timeMinutes - b.timeMinutes);
    if (sort === "nama") out.sort((a, b) => a.name.localeCompare(b.name, "id"));
    return out;
  }, [recipes, q, cat, origin, time, sort]);

  const SORTS: Array<[Sort, string]> = [["baru", "Terbaru"], ["cepat", "Tercepat"], ["nama", "A sampai Z"]];

  return (
    <>
      <PageHeader title="Cari Resep" onBack={() => router.back()} />
      <div className="px-4">
        <label className="flex items-center gap-2.5 rounded-full bg-white px-4 py-3 ring-1 ring-line focus-within:ring-primary-600">
          <Search size={18} className="text-primary-600" />
          <input autoFocus={!params.get("q")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari resep, bahan, atau ide masak..." className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted" />
          {q && (
            <button onClick={() => setQ("")} aria-label="Hapus" className="grid h-6 w-6 place-items-center rounded-full bg-sunken-2">
              <X size={14} />
            </button>
          )}
        </label>

        <div className="no-scrollbar -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted">Asal</span>
          {(["Semua", "Lokal", "Luar"] as const).map((o) => (
            <Chip key={o} active={origin === o} onClick={() => setOrigin(o)}>{o === "Semua" ? "Semua" : `Masakan ${o}`}</Chip>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted">Jenis</span>
          {["Semua", ...CATEGORIES.filter((c) => c !== "Lainnya")].map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>
          ))}
        </div>
        <div className="no-scrollbar -mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted">Waktu</span>
          {([["all", "Semua"], ["fast", "< 15 mnt"], ["mid", "15 - 30 mnt"], ["long", "> 30 mnt"]] as Array<[Time, string]>).map(([k, l]) => (
            <Chip key={k} active={time === k} onClick={() => setTime(k)}>{l}</Chip>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[13px] text-body">
            Ditemukan <b className="text-primary-600">{results.length} menu</b> masakan
          </p>
          <button onClick={() => setSort(SORTS[(SORTS.findIndex(([k]) => k === sort) + 1) % SORTS.length][0])} className="text-[13px] font-extrabold text-primary-600">
            {SORTS.find(([k]) => k === sort)![1]} ⇅
          </button>
        </div>

        <div className="mt-3 space-y-4">
          {results.map((r) => (
            <RecipeListCard key={r.id} r={r} />
          ))}
          {results.length === 0 && (
            <Panel className="text-center">
              <p className="text-[14px] font-bold text-ink">Menu belum ditemukan</p>
              <p className="mt-1 text-[13px] text-body">Coba kata lain, atau minta AI membuatkan resepnya.</p>
              <Link href={`/resep-ai${q.trim() ? `?menu=${encodeURIComponent(q.trim())}` : ""}`} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-[13px] font-bold text-white">
                <Sparkles size={15} /> Tanya Resep AI
              </Link>
            </Panel>
          )}
        </div>

        <Panel className="mt-5 flex items-center gap-3 bg-sunken ring-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-600">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-extrabold text-ink">Punya bahan lain di kulkas?</p>
            <p className="text-[12px] text-body">Kombinasikan dengan AI Chef untuk variasi baru.</p>
          </div>
          <Link href="/ai-masak" className="shrink-0 rounded-lg bg-white px-3 py-2 text-[12px] font-extrabold text-primary-700 ring-1 ring-line">
            Coba AI
          </Link>
        </Panel>
      </div>
    </>
  );
}

export default function CariPage() {
  return (
    <Suspense fallback={null}>
      <CariInner />
    </Suspense>
  );
}
