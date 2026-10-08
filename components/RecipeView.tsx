"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Camera, ChefHat, Check, Clock, Share2, ShieldCheck, Users, Gauge, Lightbulb, Utensils, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Ingredient, Recipe } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { useRecipes } from "@/lib/recipes-context";
import { uploadImage } from "@/lib/cloudinary";
import { RecipeImage } from "./RecipeImage";
import { Badge, Button, Notice, Spinner } from "./ui";

function groupIngredients(list: Ingredient[]) {
  const map = new Map<string, Array<{ ing: Ingredient; idx: number }>>();
  list.forEach((ing, idx) => {
    const g = ing.group || "Bahan-bahan";
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push({ ing, idx });
  });
  return [...map.entries()];
}

const isSeasoning = (g: string) => /bumbu|saus|marinasi|rempah/i.test(g);

export function RecipeView({ recipe, preview = false }: { recipe: Recipe; preview?: boolean }) {
  const { toggleSave, setPhoto, getRecipe } = useRecipes();
  const live = preview ? recipe : (getRecipe(recipe.id) ?? recipe); // versi terbaru (status simpan, foto)
  const [tab, setTab] = useState<"bahan" | "langkah">("bahan");
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [cooking, setCooking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setTicked(new Set()), [recipe.id]);

  const groups = useMemo(() => groupIngredients(live.ingredients), [live.ingredients]);

  async function onPick(file?: File) {
    if (!file) return;
    setUploading(true);
    setPhotoErr("");
    try {
      await setPhoto(live, await uploadImage(file));
    } catch (e) {
      setPhotoErr((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function share() {
    const text = `${live.name}\n\nBahan:\n${live.ingredients.map((i) => `- ${i.item} (${i.qty})`).join("\n")}\n\nCara memasak:\n${live.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nDari DapurQu`;
    try {
      if (navigator.share) await navigator.share({ title: live.name, text });
      else {
        await navigator.clipboard.writeText(text);
        alert("Resep disalin ke clipboard.");
      }
    } catch {}
  }

  return (
    <div className={preview ? "pb-2" : "pb-32"}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl">
        <RecipeImage name={live.name} src={live.imageUrl} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge tone={live.origin === "Lokal" ? "primary" : "green"}>{live.origin}</Badge>
          <Badge tone="light">{live.category}</Badge>
        </div>
        {!preview && <button onClick={() => fileRef.current?.click()} className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-ink backdrop-blur active:scale-95" disabled={uploading}>
          {uploading ? <Spinner className="h-3 w-3" /> : <Camera size={13} />}
          {live.imageUrl ? "Ganti foto" : "Tambah foto"}
        </button>}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0])} />
        <div className="absolute inset-x-4 bottom-4 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">{live.source === "ai" ? "Hasil kreasi AI" : "Resep bawaan DapurQu"}</p>
          <h2 className="mt-0.5 text-[22px] font-extrabold leading-tight">{live.name}</h2>
        </div>
      </div>
      {photoErr && (
        <div className="mt-3">
          <Notice tone="error">{photoErr}</Notice>
        </div>
      )}

      {live.description && <p className="mt-4 text-[14px] leading-relaxed text-body">{live.description}</p>}

      <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl bg-white py-3 text-center ring-1 ring-line/70">
        <Stat icon={<Clock size={18} />} label="Waktu" value={formatTime(live.timeMinutes)} />
        <Stat icon={<Users size={18} />} label="Porsi" value={`${live.servings} Porsi`} />
        <Stat icon={<Gauge size={18} />} label="Tingkat" value={live.level} />
      </div>

      {live.nutrition && live.nutrition.kcal > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-line/70">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary-100 text-secondary-600">
            <ShieldCheck size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-extrabold leading-none text-ink">
              {live.nutrition.kcal} <span className="text-xs font-semibold text-body">kkal / porsi</span>
            </p>
            <p className="mt-1 text-[11px] text-muted">Perkiraan AI, belum diverifikasi</p>
          </div>
          <div className="flex gap-1.5 text-center text-[10px] font-bold">
            <span className="rounded-lg bg-sunken px-2 py-1">PROTEIN<br />{live.nutrition.protein}g</span>
            <span className="rounded-lg bg-sunken px-2 py-1">KARBO<br />{live.nutrition.carbs}g</span>
          </div>
        </div>
      )}

      <div className="mt-4 flex rounded-2xl bg-sunken p-1">
        <TabBtn active={tab === "bahan"} onClick={() => setTab("bahan")}>Bahan-Bahan ({live.ingredients.length})</TabBtn>
        <TabBtn active={tab === "langkah"} onClick={() => setTab("langkah")}>Langkah Memasak ({live.steps.length})</TabBtn>
      </div>

      {tab === "bahan" ? (
        <div className="mt-4 space-y-5 rounded-3xl bg-white p-4 ring-1 ring-line/70">
          {groups.map(([group, rows]) => (
            <section key={group}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
                  <span className="h-2 w-2 rounded-full bg-primary-600" />
                  {group}
                </h3>
                {!isSeasoning(group) && <span className="text-[11px] font-semibold text-primary-600">Tap jika sudah siap</span>}
              </div>
              {isSeasoning(group) ? (
                <div className="grid grid-cols-2 gap-2">
                  {rows.map(({ ing, idx }) => (
                    <button key={idx} onClick={() => toggle(idx)} className={cn("rounded-xl bg-sunken p-3 text-left", ticked.has(idx) && "opacity-50")}>
                      <p className={cn("text-[13px] text-ink", ticked.has(idx) && "line-through")}>{ing.item}</p>
                      <p className="mt-1 text-[12px] font-bold text-primary-600">{ing.qty}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <ul className="space-y-2">
                  {rows.map(({ ing, idx }) => (
                    <li key={idx}>
                      <button onClick={() => toggle(idx)} className="flex w-full items-center gap-3 rounded-xl bg-sunken/70 px-3 py-3 text-left">
                        <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2", ticked.has(idx) ? "border-secondary-600 bg-secondary-600 text-white" : "border-line bg-white")}>
                          {ticked.has(idx) && <Check size={14} strokeWidth={3} />}
                        </span>
                        <span className={cn("flex-1 text-[14px] text-ink", ticked.has(idx) && "text-muted line-through")}>{ing.item}</span>
                        <span className="rounded-lg bg-white px-2.5 py-1 text-[12px] font-bold text-body ring-1 ring-line">{ing.qty}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {live.tools && live.tools.length > 0 && (
            <section className="border-t border-line pt-4">
              <h3 className="mb-2 flex items-center gap-2 text-[14px] font-extrabold text-ink">
                <Utensils size={15} /> Peralatan Memasak yang Dibutuhkan
              </h3>
              <div className="flex flex-wrap gap-2">
                {live.tools.map((t) => (
                  <span key={t} className="rounded-full bg-sunken px-3 py-1.5 text-[12px] font-semibold text-body ring-1 ring-line">{t}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <ol className="mt-4 space-y-3 rounded-3xl bg-white p-4 ring-1 ring-line/70">
          {live.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-600 text-[13px] font-extrabold text-white">{i + 1}</span>
              <p className="pt-0.5 text-[14px] leading-relaxed text-ink">{s}</p>
            </li>
          ))}
        </ol>
      )}

      {live.tips && (
        <div className="mt-4 flex gap-3 rounded-2xl bg-primary-50 p-4">
          <Lightbulb className="mt-0.5 shrink-0 text-primary-600" size={18} />
          <p className="text-[13px] leading-relaxed text-primary-800">
            <b>{live.source === "ai" ? "Tips AI Chef: " : "Tips: "}</b>
            {live.tips}
          </p>
        </div>
      )}

      {live.note && (
        <div className="mt-4">
          <Notice tone="warn">{live.note}</Notice>
        </div>
      )}

      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
        {live.source === "ai" ? "Dibuat AI dan belum dicek manual. Sesuaikan takaran dengan selera." : "Takaran resep bawaan belum diuji satu per satu. Sesuaikan dengan selera."}
        {live.estimated && <><br />Waktu, tingkat kesulitan, dan deskripsi singkat adalah perkiraan.</>}
        {live.credit && <><br />{live.credit}</>}
      </p>

      {!preview && (<div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+4.1rem)] z-30 mx-auto flex max-w-md gap-2 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-2 pt-5">
        <button onClick={() => toggleSave(live)} aria-label={live.saved ? "Hapus dari tersimpan" : "Simpan resep"} className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-white ring-1 ring-line active:bg-sunken">
          <Bookmark size={21} className={live.saved ? "fill-primary-600 text-primary-600" : "text-ink"} />
        </button>
        <button onClick={share} aria-label="Bagikan" className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-white ring-1 ring-line active:bg-sunken">
          <Share2 size={20} />
        </button>
        <Button full onClick={() => setCooking(true)} className="h-[52px]">
          Mulai Mode Memasak <ChefHat size={18} />
        </Button>
      </div>)}

      {!preview && cooking && <CookMode recipe={live} onClose={() => setCooking(false)} />}
    </div>
  );

  function toggle(idx: number) {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1">
      <span className="text-primary-600">{icon}</span>
      <span className="text-[11px] text-muted">{label}</span>
      <span className="text-[13px] font-extrabold text-ink">{value}</span>
    </div>
  );
}

function TabBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex-1 rounded-xl px-2 py-2.5 text-[13px] font-bold transition", active ? "bg-white text-primary-700 shadow-sm" : "text-body")}>
      {children}
    </button>
  );
}

/** Mode memasak: satu langkah per layar, layar dijaga tetap menyala bila didukung browser. */
function CookMode({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [i, setI] = useState(0);
  const total = recipe.steps.length;

  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-bg">
      <div className="flex items-center gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <button onClick={onClose} aria-label="Tutup" className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-line">
          <X size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold">{recipe.name}</p>
          <p className="text-xs text-muted">Langkah {i + 1} dari {total}</p>
        </div>
      </div>
      <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-sunken-2">
        <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${((i + 1) / total) * 100}%` }} />
      </div>
      <div className="flex flex-1 flex-col justify-center px-6">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary-600 text-xl font-extrabold text-white">{i + 1}</span>
        <p className="text-[22px] font-bold leading-snug text-ink">{recipe.steps[i]}</p>
      </div>
      <div className="flex gap-3 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
        <Button variant="secondary" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0} className="flex-1">
          <ChevronLeft size={18} /> Kembali
        </Button>
        {i < total - 1 ? (
          <Button onClick={() => setI((v) => v + 1)} className="flex-[1.4]">
            Lanjut <ChevronRight size={18} />
          </Button>
        ) : (
          <Button onClick={onClose} className="flex-[1.4]">
            Selesai <Check size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
