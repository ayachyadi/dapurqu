"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Camera, Plus, Sparkles, Trash2, X } from "lucide-react";
import { RecipeView } from "@/components/RecipeView";
import { Thumb } from "./Thumb";
import { Notice, Spinner } from "@/components/ui";
import { AdminHeader } from "./AdminHeader";
import { CATEGORIES, type Category, type Level, type Origin, type Recipe } from "@/lib/types";
import { useAi } from "@/lib/ai-context";
import { AiError, extractRecipe } from "@/lib/gemini";
import { uploadImage } from "@/lib/cloudinary";
import { deleteCatalogRecipe, newId, saveCatalogRecipe } from "@/lib/admin";
import { cn } from "@/lib/utils";

interface Row { item: string; qty: string }
interface Group { name: string; rows: Row[] }
interface Draft {
  name: string;
  description: string;
  origin: Origin;
  category: Category;
  timeMinutes: number;
  level: Level;
  servings: number;
  groups: Group[];
  steps: string[];
  tips: string;
  tools: string;
  credit: string;
  note: string;
  estimated: boolean;
  status: "draft" | "published";
  verified: boolean;
  imageUrl?: string;
}

const EMPTY: Draft = {
  name: "",
  description: "",
  origin: "Lokal",
  category: "Ayam",
  timeMinutes: 30,
  level: "Mudah",
  servings: 4,
  groups: [{ name: "Bahan Utama", rows: [{ item: "", qty: "" }] }],
  steps: [""],
  tips: "",
  tools: "",
  credit: "",
  note: "",
  estimated: false,
  status: "draft",
  verified: false,
};

function toDraft(r: Recipe): Draft {
  const groups: Group[] = [];
  for (const i of r.ingredients) {
    const name = i.group || "Bahan-bahan";
    let g = groups.find((x) => x.name === name);
    if (!g) groups.push((g = { name, rows: [] }));
    g.rows.push({ item: i.item, qty: i.qty });
  }
  return {
    name: r.name,
    description: r.description ?? "",
    origin: r.origin,
    category: r.category,
    timeMinutes: r.timeMinutes,
    level: r.level,
    servings: r.servings,
    groups: groups.length ? groups : EMPTY.groups,
    steps: r.steps.length ? r.steps : [""],
    tips: r.tips ?? "",
    tools: (r.tools ?? []).join(", "),
    credit: r.credit ?? "",
    note: r.note ?? "",
    estimated: !!r.estimated,
    status: r.status === "draft" ? "draft" : "published",
    verified: !!r.verified,
    imageUrl: r.imageUrl,
  };
}

function toRecipe(d: Draft, id: string): Recipe {
  return {
    id,
    name: d.name.trim(),
    description: d.description.trim(),
    origin: d.origin,
    category: d.category,
    timeMinutes: Math.max(1, Math.round(Number(d.timeMinutes) || 1)),
    level: d.level,
    servings: Math.max(1, Math.round(Number(d.servings) || 1)),
    ingredients: d.groups.flatMap((g) =>
      g.rows.filter((r) => r.item.trim()).map((r) => ({ item: r.item.trim(), qty: r.qty.trim() || "secukupnya", group: g.name.trim() || "Bahan-bahan" })),
    ),
    steps: d.steps.map((s) => s.trim()).filter(Boolean),
    tips: d.tips.trim() || undefined,
    tools: d.tools.split(",").map((t) => t.trim()).filter(Boolean),
    credit: d.credit.trim() || undefined,
    note: d.note.trim() || undefined,
    estimated: d.estimated || undefined,
    status: d.status,
    verified: d.verified,
    imageUrl: d.imageUrl,
    source: "seed",
  };
}

function move<T>(arr: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const a = [...arr];
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}

const input = "w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-[14px] text-ink outline-none transition placeholder:text-muted focus:border-primary-600 focus:bg-white";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[12px] font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="adm-card rounded-2xl bg-white ring-1 ring-line">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold text-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function IconBtn({ onClick, label, children, danger, disabled }: { onClick: () => void; label: string; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-sunken-2 disabled:opacity-30", danger ? "text-danger" : "text-body")}>
      {children}
    </button>
  );
}

export function RecipeEditor({ recipe, existingIds }: { recipe?: Recipe; existingIds: Set<string> }) {
  const router = useRouter();
  const { settings, hasKey } = useAi();
  const [d, setD] = useState<Draft>(() => (recipe ? toDraft(recipe) : EMPTY));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [aiOpen, setAiOpen] = useState(!recipe);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = !recipe;

  function patch(p: Partial<Draft>) {
    setD((x) => ({ ...x, ...p }));
    setDirty(true);
  }

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const preview = useMemo(() => toRecipe(d, recipe?.id ?? "preview"), [d, recipe?.id]);

  function setGroup(gi: number, g: Group) {
    patch({ groups: d.groups.map((x, i) => (i === gi ? g : x)) });
  }

  async function onPhoto(file?: File) {
    if (!file) return;
    setUploading(true);
    setPhotoErr("");
    try {
      patch({ imageUrl: await uploadImage(file) });
    } catch (e) {
      setPhotoErr((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function runAi() {
    if (aiText.trim().length < 20) return setAiMsg({ tone: "error", text: "Tempel teks resep yang lebih lengkap dulu." });
    setAiBusy(true);
    setAiMsg(null);
    try {
      const r = await extractRecipe(settings, aiText);
      const draft = toDraft({ ...r, id: "x" } as Recipe);
      setD((x) => ({ ...draft, status: x.status, verified: false, imageUrl: x.imageUrl, credit: x.credit, estimated: r.estimated }));
      setDirty(true);
      setAiMsg({
        tone: "ok",
        text: `Formulir terisi${r.steps.length ? "" : ", tetapi teks tidak memuat langkah memasak"}. Periksa semua isian sebelum menyimpan.${r.estimated ? " Waktu, tingkat, atau kategori adalah perkiraan AI." : ""}`,
      });
    } catch (e) {
      setAiMsg({ tone: "error", text: e instanceof AiError ? e.message : "Gagal membaca resep. Coba lagi." });
    } finally {
      setAiBusy(false);
    }
  }

  async function save(publish?: boolean) {
    const r = toRecipe(publish === undefined ? d : { ...d, status: publish ? "published" : "draft" }, recipe?.id ?? newId(d.name || "resep", existingIds));
    const errs: string[] = [];
    if (!r.name) errs.push("Nama resep wajib diisi.");
    if (!r.ingredients.length) errs.push("Isi minimal satu bahan.");
    if (!r.steps.length) errs.push("Isi minimal satu langkah memasak.");
    setErrors(errs);
    if (errs.length) return window.scrollTo({ top: 0, behavior: "smooth" });
    setSaving(true);
    try {
      await saveCatalogRecipe(r);
      setDirty(false);
      router.replace("/admin");
    } catch (e) {
      setErrors([`Gagal menyimpan: ${(e as Error).message || "periksa koneksi dan aturan Firestore"}`]);
      setSaving(false);
    }
  }

  async function remove() {
    if (!recipe || !confirm(`Hapus resep "${recipe.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setSaving(true);
    try {
      await deleteCatalogRecipe(recipe.id);
      setDirty(false);
      router.replace("/admin");
    } catch (e) {
      setErrors([`Gagal menghapus: ${(e as Error).message}`]);
      setSaving(false);
    }
  }

  function back(e: React.MouseEvent) {
    if (dirty && !confirm("Ada perubahan yang belum disimpan. Tinggalkan halaman ini?")) e.preventDefault();
  }

  return (
    <>
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-6 pb-40 pt-6 sm:pb-28">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" onClick={back} className="grid h-10 w-10 place-items-center rounded-full bg-white ring-1 ring-line hover:bg-sunken" aria-label="Kembali">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-[22px] font-extrabold text-ink">{isNew ? "Resep baru" : "Edit resep"}</h1>
              <p className="text-[12px] text-muted">{dirty ? "Ada perubahan yang belum disimpan" : isNew ? "Isi manual, atau tempel teks resep dan biarkan AI mengisi formulir" : recipe?.id}</p>
            </div>
          </div>
          {!isNew && (
            <button onClick={remove} disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold text-danger hover:bg-red-50">
              <Trash2 size={15} /> Hapus resep
            </button>
          )}
        </div>

        {errors.length > 0 && (
          <div className="mb-4">
            <Notice tone="error">
              <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </Notice>
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-5">
            <Card
              title="Isi otomatis dengan AI"
              right={<button type="button" onClick={() => setAiOpen((o) => !o)} className="text-[13px] font-bold text-primary-600">{aiOpen ? "Tutup" : "Buka"}</button>}
            >
              {aiOpen ? (
                <div className="space-y-3">
                  <p className="text-[13px] leading-relaxed text-body">Tempel teks resep dari mana saja (PDF, web, chat). AI membaca bahan, takaran, dan langkahnya ke formulir di bawah. Hasilnya selalu perlu kamu periksa.</p>
                  {!hasKey && <Notice tone="warn">Butuh API key Gemini. Isi dulu di <Link href="/pengaturan" className="font-extrabold underline">Pengaturan</Link> akun ini.</Notice>}
                  <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} rows={6} placeholder="Tempel teks resep di sini..." className={cn(input, "resize-y")} />
                  {aiMsg && <Notice tone={aiMsg.tone}>{aiMsg.text}</Notice>}
                  <button type="button" onClick={runAi} disabled={aiBusy || !hasKey} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-50">
                    {aiBusy ? <Spinner /> : <Sparkles size={15} />} Isi formulir dari teks
                  </button>
                </div>
              ) : (
                <p className="text-[13px] text-muted">Tempel teks resep untuk mengisi formulir lebih cepat.</p>
              )}
            </Card>

            <Card title="Informasi dasar">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nama resep" className="md:col-span-2">
                  <input value={d.name} onChange={(e) => patch({ name: e.target.value })} className={input} placeholder="Contoh: Soto Ayam" />
                </Field>
                <Field label="Deskripsi singkat" className="md:col-span-2">
                  <textarea value={d.description} onChange={(e) => patch({ description: e.target.value })} rows={3} className={cn(input, "resize-y")} placeholder="Satu kalimat yang menggugah selera" />
                </Field>
                <Field label="Asal">
                  <select value={d.origin} onChange={(e) => patch({ origin: e.target.value as Origin })} className={input}>
                    <option>Lokal</option>
                    <option>Luar</option>
                  </select>
                </Field>
                <Field label="Kategori">
                  <select value={d.category} onChange={(e) => patch({ category: e.target.value as Category })} className={input}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Waktu total (menit)">
                  <input type="number" min={1} value={d.timeMinutes} onChange={(e) => patch({ timeMinutes: Number(e.target.value) })} className={input} />
                </Field>
                <Field label="Tingkat kesulitan">
                  <select value={d.level} onChange={(e) => patch({ level: e.target.value as Level })} className={input}>
                    <option>Mudah</option>
                    <option>Sedang</option>
                    <option>Sulit</option>
                  </select>
                </Field>
                <Field label="Jumlah porsi">
                  <input type="number" min={1} value={d.servings} onChange={(e) => patch({ servings: Number(e.target.value) })} className={input} />
                </Field>
              </div>
            </Card>

            <Card title="Foto">
              <div className="flex flex-wrap items-center gap-4">
                <Thumb name={d.name || "resep"} src={d.imageUrl} width={144} height={96} />
                <div className="min-w-0 space-y-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl bg-sunken px-3.5 py-2 text-[13px] font-bold text-ink hover:bg-sunken-2">
                      {uploading ? <Spinner /> : <Camera size={15} />} {d.imageUrl ? "Ganti foto" : "Unggah foto"}
                    </button>
                    {d.imageUrl && (
                      <button type="button" onClick={() => patch({ imageUrl: undefined })} className="rounded-xl px-3 py-2 text-[13px] font-bold text-danger hover:bg-red-50">Hapus foto</button>
                    )}
                  </div>
                  <p className="text-[12px] text-muted">Foto diunggah ke Cloudinary. Tanpa foto, aplikasi menampilkan placeholder.</p>
                  {photoErr && <p className="text-[12px] font-semibold text-danger">{photoErr}</p>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
              </div>
            </Card>

            <Card
              title="Bahan-bahan"
              right={<button type="button" onClick={() => patch({ groups: [...d.groups, { name: "Kelompok baru", rows: [{ item: "", qty: "" }] }] })} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-600"><Plus size={15} /> Tambah kelompok</button>}
            >
              <div className="space-y-5">
                {d.groups.map((g, gi) => (
                  <div key={gi} className="rounded-xl border border-line p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <input value={g.name} onChange={(e) => setGroup(gi, { ...g, name: e.target.value })} className={cn(input, "min-w-0 flex-1 font-bold")} placeholder="Nama kelompok (mis. Bumbu Halus)" />
                      <IconBtn label="Naik" disabled={gi === 0} onClick={() => patch({ groups: move(d.groups, gi, -1) })}><ArrowUp size={15} /></IconBtn>
                      <IconBtn label="Turun" disabled={gi === d.groups.length - 1} onClick={() => patch({ groups: move(d.groups, gi, 1) })}><ArrowDown size={15} /></IconBtn>
                      <IconBtn label="Hapus kelompok" danger disabled={d.groups.length === 1} onClick={() => patch({ groups: d.groups.filter((_, i) => i !== gi) })}><X size={16} /></IconBtn>
                    </div>
                    <div className="space-y-2">
                      {g.rows.map((r, ri) => (
                        <div key={ri} className="flex flex-wrap items-center gap-2 border-b border-dashed border-line pb-3 last:border-0 last:pb-0 sm:flex-nowrap sm:border-0 sm:pb-0">
                          <input value={r.item} onChange={(e) => setGroup(gi, { ...g, rows: g.rows.map((x, i) => (i === ri ? { ...x, item: e.target.value } : x)) })} className={cn(input, "min-w-0 basis-full sm:flex-1 sm:basis-0")} placeholder="Nama bahan" />
                          <input value={r.qty} onChange={(e) => setGroup(gi, { ...g, rows: g.rows.map((x, i) => (i === ri ? { ...x, qty: e.target.value } : x)) })} className={cn(input, "min-w-0 flex-1 sm:w-36 sm:flex-none")} placeholder="Takaran" />
                          <IconBtn label="Naik" disabled={ri === 0} onClick={() => setGroup(gi, { ...g, rows: move(g.rows, ri, -1) })}><ArrowUp size={15} /></IconBtn>
                          <IconBtn label="Turun" disabled={ri === g.rows.length - 1} onClick={() => setGroup(gi, { ...g, rows: move(g.rows, ri, 1) })}><ArrowDown size={15} /></IconBtn>
                          <IconBtn label="Hapus bahan" danger onClick={() => setGroup(gi, { ...g, rows: g.rows.length > 1 ? g.rows.filter((_, i) => i !== ri) : [{ item: "", qty: "" }] })}><Trash2 size={15} /></IconBtn>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => setGroup(gi, { ...g, rows: [...g.rows, { item: "", qty: "" }] })} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-600"><Plus size={14} /> Tambah bahan</button>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Langkah memasak" right={<button type="button" onClick={() => patch({ steps: [...d.steps, ""] })} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-primary-600"><Plus size={15} /> Tambah langkah</button>}>
              <ol className="space-y-2">
                {d.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-2 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-600 text-[12px] font-extrabold text-white">{i + 1}</span>
                    <textarea value={s} onChange={(e) => patch({ steps: d.steps.map((x, k) => (k === i ? e.target.value : x)) })} rows={2} className={cn(input, "min-w-0 flex-1 resize-y")} placeholder="Tulis langkah singkat dan jelas" />
                    <IconBtn label="Naik" disabled={i === 0} onClick={() => patch({ steps: move(d.steps, i, -1) })}><ArrowUp size={15} /></IconBtn>
                    <IconBtn label="Turun" disabled={i === d.steps.length - 1} onClick={() => patch({ steps: move(d.steps, i, 1) })}><ArrowDown size={15} /></IconBtn>
                    <IconBtn label="Hapus langkah" danger onClick={() => patch({ steps: d.steps.length > 1 ? d.steps.filter((_, k) => k !== i) : [""] })}><Trash2 size={15} /></IconBtn>
                  </li>
                ))}
              </ol>
            </Card>

            <Card title="Tambahan">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tips (opsional)" className="md:col-span-2">
                  <textarea value={d.tips} onChange={(e) => patch({ tips: e.target.value })} rows={2} className={cn(input, "resize-y")} />
                </Field>
                <Field label="Peralatan (pisahkan dengan koma)" className="md:col-span-2">
                  <input value={d.tools} onChange={(e) => patch({ tools: e.target.value })} className={input} placeholder="Wajan, Panci, Blender" />
                </Field>
                <Field label="Sumber resep">
                  <input value={d.credit} onChange={(e) => patch({ credit: e.target.value })} className={input} placeholder="Contoh: Resep keluarga" />
                </Field>
                <Field label="Catatan di halaman resep (opsional)">
                  <input value={d.note} onChange={(e) => patch({ note: e.target.value })} className={input} placeholder="Mis. takaran perlu dicek ulang" />
                </Field>
                <label className="flex items-center gap-2 text-[13px] text-body md:col-span-2">
                  <input type="checkbox" checked={d.estimated} onChange={(e) => patch({ estimated: e.target.checked })} className="h-4 w-4 accent-[#964118]" />
                  Waktu, tingkat kesulitan, dan deskripsi masih perkiraan (ditampilkan di bawah resep)
                </label>
              </div>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted">Pratinjau di aplikasi</p>
            <div className="mx-auto w-[390px] max-w-full overflow-hidden rounded-[2.2rem] border-[7px] border-ink/90 bg-bg">
              <div className="max-h-[78vh] overflow-y-auto p-4">
                <RecipeView recipe={preview} preview />
              </div>
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <div className="inline-flex rounded-xl bg-sunken p-1">
            {(["draft", "published"] as const).map((s) => (
              <button key={s} type="button" onClick={() => patch({ status: s })} className={cn("rounded-lg px-3 py-1.5 text-[12px] font-bold", d.status === s ? "bg-white text-primary-700 shadow-sm" : "text-body")}>
                {s === "draft" ? "Draft" : "Published"}
                <span className="hidden sm:inline">{s === "draft" ? " (disembunyikan)" : " (tampil)"}</span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-body">
            <input type="checkbox" checked={d.verified} onChange={(e) => patch({ verified: e.target.checked })} className="h-4 w-4 accent-[#2e6c30]" />
            Sudah dicek<span className="hidden sm:inline"> dan dicoba</span>
          </label>
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <Link href="/admin" onClick={back} className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-body hover:bg-sunken">Batal</Link>
            <button type="button" onClick={() => save()} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-primary-700 disabled:opacity-60 sm:flex-none">
              {saving && <Spinner />} Simpan
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
