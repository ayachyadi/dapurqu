"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Download, FileUp, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Thumb } from "@/components/admin/Thumb";
import { Notice, Spinner } from "@/components/ui";
import { SEED_RECIPES } from "@/lib/seed";
import { CATEGORIES, type Recipe } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { deleteCatalogRecipe, downloadJson, importJsonFile, importSeeds, movePhotosToCatalog, newId, saveCatalogRecipe, useAllCatalog, useMyPhotoOverrides } from "@/lib/admin";
import { useAuth } from "@/lib/auth-context";

export default function AdminList() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, loading, imported } = useAllCatalog(true);
  const myPhotos = useMyPhotoOverrides(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const [origin, setOrigin] = useState("Semua");
  const [status, setStatus] = useState("Semua");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const ids = useMemo(() => new Set(items.map((r) => r.id)), [items]);
  const missingSeeds = SEED_RECIPES.filter((r) => !ids.has(r.id)).length;
  const movable = useMemo(() => items.filter((r) => !r.imageUrl && myPhotos[r.id]).map((r) => [r.id, myPhotos[r.id]] as [string, string]), [items, myPhotos]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((r) => {
        if (cat !== "Semua" && r.category !== cat) return false;
        if (origin !== "Semua" && r.origin !== origin) return false;
        if (status === "Draft" && r.status !== "draft") return false;
        if (status === "Published" && r.status === "draft") return false;
        if (status === "Belum dicek" && r.verified) return false;
        if (!term) return true;
        return `${r.name} ${r.category} ${r.ingredients.map((i) => i.item).join(" ")}`.toLowerCase().includes(term);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [items, q, cat, origin, status]);

  const stats = {
    total: items.length,
    published: items.filter((r) => r.status !== "draft").length,
    draft: items.filter((r) => r.status === "draft").length,
    unverified: items.filter((r) => !r.verified).length,
  };

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(label);
    setMsg(null);
    try {
      setMsg({ tone: "ok", text: await fn() });
    } catch (e) {
      setMsg({ tone: "error", text: `Gagal: ${(e as Error).message || "terjadi kendala"}` });
    } finally {
      setBusy("");
    }
  }

  const toggle = (r: Recipe, patch: Partial<Recipe>) => run("toggle", async () => {
    await saveCatalogRecipe({ ...r, ...patch });
    return "Perubahan tersimpan.";
  });

  async function duplicate(r: Recipe) {
    const id = newId(`${r.name} salinan`, ids);
    await run("dup", async () => {
      await saveCatalogRecipe({ ...r, id, name: `${r.name} (salinan)`, status: "draft", verified: false });
      router.push(`/admin/${id}`);
      return "Salinan dibuat sebagai draft.";
    });
  }

  async function remove(r: Recipe) {
    if (!confirm(`Hapus resep "${r.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    await run("del", async () => {
      await deleteCatalogRecipe(r.id);
      return `"${r.name}" dihapus.`;
    });
  }

  return (
    <>
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-extrabold text-ink">Katalog Resep</h1>
            <p className="text-[13px] text-body">Perubahan langsung terlihat di aplikasi, tanpa deploy ulang.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => downloadJson(items)} disabled={!items.length} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-ink ring-1 ring-line hover:bg-sunken disabled:opacity-50">
              <Download size={15} /> Ekspor JSON
            </button>
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-ink ring-1 ring-line hover:bg-sunken">
              <FileUp size={15} /> Impor JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (!confirm("Resep dengan ID yang sama akan ditimpa. Lanjutkan impor?")) return;
                run("json", async () => {
                  const { added, skipped } = await importJsonFile(f, ids);
                  return `${added} resep diimpor${skipped ? `, ${skipped} dilewati karena data tidak lengkap` : ""}.`;
                });
              }}
            />
            <Link href="/admin/baru" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-primary-700">
              <Plus size={16} /> Resep baru
            </Link>
          </div>
        </div>

        {(!imported || missingSeeds > 0) && !loading && (
          <div className="mt-5">
            <Notice tone="warn">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  {imported
                    ? `${missingSeeds} resep bawaan belum ada di katalog.`
                    : `Resep bawaan (${SEED_RECIPES.length}) masih dibaca dari kode dan belum bisa diedit. Impor sekali ke katalog agar bisa dikelola dari dashboard ini.`}
                </p>
                <button
                  onClick={() => run("seed", async () => `${await importSeeds(ids)} resep bawaan diimpor ke katalog.`)}
                  disabled={!!busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                >
                  {busy === "seed" ? <Spinner /> : <Upload size={15} />} Impor resep bawaan
                </button>
              </div>
            </Notice>
          </div>
        )}

        {movable.length > 0 && (
          <div className="mt-4">
            <Notice tone="info">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>
                  {movable.length} foto yang kamu unggah lewat aplikasi masih tersimpan di akunmu sendiri, jadi belum tampil di dashboard dan tidak terlihat pengguna lain. Pindahkan ke katalog agar tampil di mana-mana.
                </p>
                <button
                  onClick={() => run("photos", async () => `${await movePhotosToCatalog(user!.uid, movable)} foto dipindahkan ke katalog.`)}
                  disabled={!!busy || !user}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                >
                  {busy === "photos" ? <Spinner /> : <Upload size={15} />} Pindahkan {movable.length} foto
                </button>
              </div>
            </Notice>
          </div>
        )}

        {msg && (
          <div className="mt-4">
            <Notice tone={msg.tone === "error" ? "error" : "ok"}>{msg.text}</Notice>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Total resep", stats.total],
            ["Tampil di aplikasi", stats.published],
            ["Draft", stats.draft],
            ["Belum dicek", stats.unverified],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <p className="text-[12px] font-semibold text-muted">{l}</p>
              <p className="mt-1 text-[26px] font-extrabold text-ink">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-line focus-within:ring-primary-600">
            <Search size={16} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, kategori, atau bahan..." className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted" />
          </label>
          <Select value={cat} onChange={setCat} options={["Semua", ...CATEGORIES]} />
          <Select value={origin} onChange={setOrigin} options={["Semua", "Lokal", "Luar"]} />
          <Select value={status} onChange={setStatus} options={["Semua", "Published", "Draft", "Belum dicek"]} />
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead className="bg-sunken text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Resep</th>
                <th className="px-3 py-3">Kategori</th>
                <th className="px-3 py-3">Asal</th>
                <th className="px-3 py-3">Waktu</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Dicek</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-sunken/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/${r.id}`} className="flex items-center gap-3">
                      <Thumb name={r.name} src={r.imageUrl} width={56} height={44} />
                      <span className="min-w-0">
                        <span className="block truncate font-extrabold text-ink">{r.name}</span>
                        <span className="block truncate text-[12px] text-muted">{r.ingredients.length} bahan, {r.steps.length} langkah</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 text-body">{r.category}</td>
                  <td className="px-3 text-body">{r.origin}</td>
                  <td className="px-3 text-body">{formatTime(r.timeMinutes)}</td>
                  <td className="px-3">
                    <button
                      onClick={() => toggle(r, { status: r.status === "draft" ? "published" : "draft" })}
                      className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", r.status === "draft" ? "bg-amber-100 text-amber-800" : "bg-secondary-100 text-secondary-700")}
                      title="Klik untuk mengubah status"
                    >
                      {r.status === "draft" ? "Draft" : "Published"}
                    </button>
                  </td>
                  <td className="px-3">
                    <button onClick={() => toggle(r, { verified: !r.verified })} title="Tandai sudah dicek atau belum" className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", r.verified ? "bg-secondary-100 text-secondary-700" : "bg-sunken-2 text-muted")}>
                      <CheckCircle2 size={13} /> {r.verified ? "Sudah" : "Belum"}
                    </button>
                  </td>
                  <td className="px-4">
                    <div className="flex justify-end gap-1">
                      <IconLink href={`/admin/${r.id}`} label="Edit"><Pencil size={16} /></IconLink>
                      <IconBtn onClick={() => duplicate(r)} label="Duplikat"><Copy size={16} /></IconBtn>
                      <IconBtn onClick={() => remove(r)} label="Hapus" danger><Trash2 size={16} /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted"><Spinner className="mr-2" /> Memuat...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">{items.length ? "Tidak ada resep yang cocok dengan filter." : "Katalog masih kosong. Impor resep bawaan atau buat resep baru."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-muted">Menampilkan {rows.length} dari {items.length} resep.</p>
      </main>
    </>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl bg-white px-3 py-2.5 text-[13px] font-semibold text-ink ring-1 ring-line outline-none focus:ring-primary-600">
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={label} title={label} className="grid h-9 w-9 place-items-center rounded-lg text-body hover:bg-sunken-2">
      {children}
    </Link>
  );
}

function IconBtn({ onClick, label, children, danger }: { onClick: () => void; label: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={cn("grid h-9 w-9 place-items-center rounded-lg hover:bg-sunken-2", danger ? "text-danger" : "text-body")}>
      {children}
    </button>
  );
}
