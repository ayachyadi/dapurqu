"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lightbulb, LayoutGrid, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { RecipeGridCard } from "@/components/RecipeCard";
import { Chip } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useRecipes } from "@/lib/recipes-context";
import { KITCHEN_TIPS } from "@/lib/seed";
import { daySeed, greeting, seededShuffle } from "@/lib/utils";

type Filter = "Semua" | "Lokal" | "Luar" | "Cepat";

export default function Beranda() {
  const { profile, user } = useAuth();
  const { recipes, ready } = useRecipes();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("Semua");
  const [q, setQ] = useState("");

  const name = profile?.displayName || user?.displayName || "Chef";

  const list = useMemo(() => {
    const base = recipes.filter((r) => (filter === "Lokal" ? r.origin === "Lokal" : filter === "Luar" ? r.origin === "Luar" : filter === "Cepat" ? r.timeMinutes <= 20 : true));
    // Rekomendasi tetap per hari. Resep AI buatan sendiri selalu di depan.
    const mine = base.filter((r) => r.source === "ai").slice(0, 2);
    const rest = seededShuffle(base.filter((r) => r.source === "seed"), daySeed());
    return [...mine, ...rest].slice(0, 6);
  }, [recipes, filter]);

  const tip = KITCHEN_TIPS[daySeed() % KITCHEN_TIPS.length];
  const initial = name.trim().charAt(0).toUpperCase();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/cari${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  }

  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
      <header className="flex items-center gap-3">
        <Link href="/pengaturan" aria-label="Pengaturan" className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-primary-100 ring-2 ring-white">
          {profile?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoURL} alt="Foto profil" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-lg font-extrabold text-primary-700">{initial}</span>
          )}
        </Link>
        <div className="min-w-0">
          <p className="truncate text-[12px] text-body">
            {greeting()}, {name}! 👋
          </p>
          <p className="text-[19px] font-extrabold leading-tight text-primary-600">DapurQu</p>
        </div>
      </header>

      <h1 className="mt-6 text-[28px] font-extrabold leading-tight text-ink">
        Mau masak apa <span className="text-primary-600">hari ini?</span>
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-body">Eksplor menu cerdas dan resep lezat bersama asisten koki AI.</p>

      <form onSubmit={submitSearch} className="mt-4 flex gap-2">
        <label className="flex flex-1 items-center gap-2.5 rounded-full bg-sunken-2/70 px-4 py-3 ring-1 ring-line">
          <Search size={18} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari resep, bahan, atau ide masak..." className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-muted" enterKeyHint="search" />
        </label>
        <Link href="/cari" aria-label="Filter" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sunken-2/70 text-body ring-1 ring-line">
          <SlidersHorizontal size={18} />
        </Link>
      </form>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/ai-masak" className="rounded-3xl bg-gradient-to-br from-primary-100 to-primary-50 p-4 ring-1 ring-primary-200/60 active:scale-[0.98]">
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-primary-600 px-2.5 py-1 text-[10px] font-bold text-white">Populer</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-200/70 text-primary-700">
              <LayoutGrid size={16} />
            </span>
          </div>
          <h2 className="mt-3 text-[15px] font-extrabold leading-tight text-ink">Masak dari Bahan Dapur</h2>
          <p className="mt-1 text-[12px] leading-snug text-body">Punya bahan? AI buatkan menunya instan.</p>
          <p className="mt-3 flex items-center gap-1 text-[12px] font-extrabold text-primary-600">
            Buka Kulkas AI <ArrowRight size={13} />
          </p>
        </Link>
        <Link href="/resep-ai" className="rounded-3xl bg-gradient-to-br from-secondary-100 to-secondary-50 p-4 ring-1 ring-secondary-200/70 active:scale-[0.98]">
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-secondary-600 px-2.5 py-1 text-[10px] font-bold text-white">Cerdas</span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-secondary-200/70 text-secondary-700">
              <Sparkles size={16} />
            </span>
          </div>
          <h2 className="mt-3 text-[15px] font-extrabold leading-tight text-ink">Tanya Resep AI</h2>
          <p className="mt-1 text-[12px] leading-snug text-body">Ketik masakan, dapatkan takaran dan cara buat.</p>
          <p className="mt-3 flex items-center gap-1 text-[12px] font-extrabold text-secondary-600">
            Mulai Tanya <ArrowRight size={13} />
          </p>
        </Link>
      </div>

      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4">
        <Chip active={filter === "Semua"} onClick={() => setFilter("Semua")}>Semua</Chip>
        <Chip active={filter === "Lokal"} onClick={() => setFilter("Lokal")}>🇮🇩 Masakan Lokal</Chip>
        <Chip active={filter === "Luar"} onClick={() => setFilter("Luar")}>🌍 Masakan Luar</Chip>
        <Chip active={filter === "Cepat"} onClick={() => setFilter("Cepat")}>⚡ Cepat Saji</Chip>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <h2 className="text-[18px] font-extrabold text-ink">Rekomendasi Hari Ini</h2>
          <p className="text-[12px] text-muted">Berganti setiap hari</p>
        </div>
        <Link href="/cari" className="text-[13px] font-extrabold text-primary-600">
          Lihat Semua
        </Link>
      </div>

      {!ready && list.length === 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {list.map((r) => (
            <RecipeGridCard key={r.id} r={r} />
          ))}
        </div>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-3xl bg-sunken p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-primary-600 ring-1 ring-line">
          <Lightbulb size={18} />
        </span>
        <div>
          <p className="text-[14px] font-extrabold text-ink">Tips Dapur Hari Ini</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-body">{tip}</p>
        </div>
      </div>
    </div>
  );
}
