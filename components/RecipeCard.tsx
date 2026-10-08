"use client";

import Link from "next/link";
import { Bookmark, Clock, Users, ArrowRight, Flame } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { useRecipes } from "@/lib/recipes-context";
import { RecipeImage } from "./RecipeImage";
import { Badge } from "./ui";

function tagLabel(r: Recipe) {
  if (r.source === "ai") return "Kreasi AI";
  if (r.timeMinutes <= 20) return "Cepat Saji";
  return r.category;
}

function SaveButton({ r, className }: { r: Recipe; className?: string }) {
  const { toggleSave } = useRecipes();
  return (
    <button
      aria-label={r.saved ? "Hapus dari tersimpan" : "Simpan resep"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSave(r);
      }}
      className={cn("grid h-8 w-8 place-items-center rounded-full bg-white/90 backdrop-blur active:scale-95", className)}
    >
      <Bookmark size={16} className={r.saved ? "fill-primary-600 text-primary-600" : "text-ink/70"} />
    </button>
  );
}

/** Kartu kecil untuk grid 2 kolom (Beranda, Tersimpan). */
export function RecipeGridCard({ r }: { r: Recipe }) {
  return (
    <Link href={`/resep/${r.id}`} className="block overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_-6px_rgba(60,40,20,0.2)] ring-1 ring-line/70 active:scale-[0.98]">
      <div className="relative aspect-[4/3]">
        <RecipeImage name={r.name} src={r.imageUrl} />
        <Badge tone={r.origin === "Lokal" ? "primary" : "green"} className="absolute left-2 top-2">
          {r.origin}
        </Badge>
        <SaveButton r={r} className="absolute right-2 top-2" />
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[14px] font-extrabold leading-tight text-ink">{r.name}</h3>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-body">
          <Clock size={13} />
          <span>{formatTime(r.timeMinutes)}</span>
          <span className="text-muted">•</span>
          <span className="font-bold text-secondary-600">{r.level}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-line/70 pt-2 text-[11px]">
          <span className="flex items-center gap-1 text-body">
            <Users size={12} />
            {r.servings} porsi
          </span>
          <span className="font-bold text-primary-600">{tagLabel(r)}</span>
        </div>
      </div>
    </Link>
  );
}

/** Kartu lebar untuk daftar hasil pencarian. */
export function RecipeListCard({ r }: { r: Recipe }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_2px_14px_-6px_rgba(60,40,20,0.2)] ring-1 ring-line/70">
      <Link href={`/resep/${r.id}`} className="block">
        <div className="relative aspect-[16/9]">
          <RecipeImage name={r.name} src={r.imageUrl} />
          <div className="absolute left-3 top-3 flex gap-1.5">
            <Badge tone="primary">{tagLabel(r)}</Badge>
            <Badge tone="light">{r.origin}</Badge>
          </div>
          <SaveButton r={r} className="absolute right-3 top-3" />
          <Badge tone="dark" className="absolute bottom-3 left-3">
            <Clock size={12} /> {formatTime(r.timeMinutes)}
          </Badge>
        </div>
      </Link>
      <div className="p-4">
        <h3 className="text-[16px] font-extrabold text-ink">{r.name}</h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-body">{r.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-secondary-600">
            <Flame size={14} /> Level: {r.level}
          </span>
          <Link href={`/resep/${r.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-[13px] font-bold text-white active:bg-primary-700">
            Buka Resep <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
