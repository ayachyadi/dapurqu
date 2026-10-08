"use client";

import { useEffect, useState } from "react";
import { collection, deleteField, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { firestore } from "./firebase";
import { useAuth } from "./auth-context";
import { SEED_RECIPES } from "./seed";
import { CATEGORIES, type Category, type Level, type Origin, type Recipe } from "./types";
import { clean } from "./utils";

/** Admin = ada dokumen admins/{uid} di Firestore (dibuat manual lewat Firebase Console). */
export function useAdmin() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, isAdmin: false });
  useEffect(() => {
    if (!user) {
      setState({ loading: false, isAdmin: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      doc(firestore(), "admins", user.uid),
      (snap) => setState({ loading: false, isAdmin: snap.exists() }),
      () => setState({ loading: false, isAdmin: false }),
    );
  }, [user]);
  return state;
}

/** Semua resep katalog (termasuk draft). Hanya untuk admin. */
export function useAllCatalog(enabled: boolean) {
  const [items, setItems] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [imported, setImported] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const u1 = onSnapshot(
      collection(firestore(), "recipes"),
      (snap) => {
        setItems(snap.docs.map((d) => ({ ...(d.data() as Recipe), id: d.id, source: "seed" as const })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    const u2 = onSnapshot(doc(firestore(), "config", "catalog"), (s) => setImported(!!s.data()?.imported), () => {});
    return () => {
      u1();
      u2();
    };
  }, [enabled]);
  return { items, loading, imported };
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, " dan ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "resep"
  );
}

export function newId(name: string, existing: Set<string>) {
  const base = slugify(name);
  let id = base;
  let n = 2;
  while (existing.has(id)) id = `${base}-${n++}`;
  return id;
}

function toDoc(r: Recipe): Recipe {
  const { saved: _saved, createdAt: _createdAt, ...rest } = r;
  void _saved;
  void _createdAt;
  return clean({ ...rest, source: "seed" as const, updatedAt: Date.now() });
}

export async function saveCatalogRecipe(r: Recipe) {
  await setDoc(doc(firestore(), "recipes", r.id), toDoc(r));
}

export async function deleteCatalogRecipe(id: string) {
  await deleteDoc(doc(firestore(), "recipes", id));
}

async function commit(items: Recipe[]) {
  for (let i = 0; i < items.length; i += 400) {
    const batch = writeBatch(firestore());
    for (const r of items.slice(i, i + 400)) batch.set(doc(firestore(), "recipes", r.id), toDoc(r));
    await batch.commit();
  }
}

/** Salin resep bawaan (lib/seed.ts) ke Firestore. Yang sudah ada tidak ditimpa. */
export async function importSeeds(existingIds: Set<string>) {
  const todo = SEED_RECIPES.filter((r) => !existingIds.has(r.id)).map((r) => ({ ...r, status: "published" as const, verified: false }));
  await commit(todo);
  await setDoc(doc(firestore(), "config", "catalog"), { imported: true, at: Date.now() }, { merge: true });
  return todo.length;
}

/* ---------- Ekspor dan impor JSON ---------- */
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : d;
};

export function sanitizeRecipe(raw: unknown, existing: Set<string>): Recipe | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name);
  const ingredients = (Array.isArray(r.ingredients) ? r.ingredients : [])
    .map((i) => {
      const o = (i ?? {}) as Record<string, unknown>;
      return { item: str(o.item), qty: str(o.qty) || "secukupnya", group: str(o.group) || "Bahan-bahan" };
    })
    .filter((i) => i.item);
  const steps = (Array.isArray(r.steps) ? r.steps : []).map(str).filter(Boolean);
  if (!name || !ingredients.length || !steps.length) return null;
  const level = (["Mudah", "Sedang", "Sulit"] as const).includes(r.level as Level) ? (r.level as Level) : "Mudah";
  const origin: Origin = r.origin === "Luar" ? "Luar" : "Lokal";
  const category: Category = (CATEGORIES as readonly string[]).includes(String(r.category)) ? (r.category as Category) : "Lainnya";
  const id = str(r.id) || newId(name, existing);
  return {
    id,
    name,
    description: str(r.description),
    origin,
    category,
    timeMinutes: num(r.timeMinutes, 30),
    level,
    servings: num(r.servings, 4),
    ingredients,
    steps,
    tips: str(r.tips) || undefined,
    tools: (Array.isArray(r.tools) ? r.tools : []).map(str).filter(Boolean),
    imageUrl: str(r.imageUrl) || undefined,
    credit: str(r.credit) || undefined,
    note: str(r.note) || undefined,
    estimated: r.estimated === true || undefined,
    status: r.status === "draft" ? "draft" : "published",
    verified: r.verified === true,
    source: "seed",
  };
}

export function downloadJson(items: Recipe[]) {
  const data = { app: "DapurQu", version: 1, exportedAt: new Date().toISOString(), recipes: items };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dapurqu-resep-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Impor dari berkas JSON ekspor. Resep dengan id sama akan ditimpa. */
export async function importJsonFile(file: File, existing: Set<string>) {
  const parsed = JSON.parse(await file.text());
  const list: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.recipes) ? parsed.recipes : [];
  const taken = new Set(existing);
  const ok: Recipe[] = [];
  let skipped = 0;
  for (const raw of list) {
    const r = sanitizeRecipe(raw, taken);
    if (!r) {
      skipped++;
      continue;
    }
    taken.add(r.id);
    ok.push(r);
  }
  await commit(ok);
  return { added: ok.length, skipped };
}

/**
 * Foto yang diunggah admin dari aplikasi sebelum fitur "foto katalog" tersimpan di akunnya sendiri
 * (users/{uid}/recipes/{id}.imageUrl). Hook ini membacanya agar bisa dipindahkan ke katalog.
 */
export function useMyPhotoOverrides(enabled: boolean) {
  const { user } = useAuth();
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!enabled || !user) return;
    return onSnapshot(
      collection(firestore(), "users", user.uid, "recipes"),
      (snap) => {
        const m: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const x = d.data() as { source?: string; imageUrl?: unknown };
          if (x.source === "seed" && typeof x.imageUrl === "string" && x.imageUrl) m[d.id] = x.imageUrl;
        });
        setMap(m);
      },
      () => {},
    );
  }, [enabled, user]);
  return map;
}

/** Salin foto pribadi ke katalog (terlihat semua pengguna), lalu hapus salinan pribadinya. */
export async function movePhotosToCatalog(uid: string, entries: Array<[string, string]>) {
  for (let i = 0; i < entries.length; i += 200) {
    const batch = writeBatch(firestore());
    for (const [id, url] of entries.slice(i, i + 200)) {
      batch.update(doc(firestore(), "recipes", id), { imageUrl: url, updatedAt: Date.now() });
      batch.update(doc(firestore(), "users", uid, "recipes", id), { imageUrl: deleteField() });
    }
    await batch.commit();
  }
  return entries.length;
}
