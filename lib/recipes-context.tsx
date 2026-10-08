"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, deleteDoc, deleteField, doc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { firestore } from "./firebase";
import { useAuth } from "./auth-context";
import { useAdmin } from "./admin";
import { SEED_RECIPES } from "./seed";
import type { Recipe } from "./types";
import { clean } from "./utils";

/**
 * Sumber data:
 *  - Katalog bersama : recipes/{id} (diedit admin lewat /admin). Hanya status "published".
 *  - Cadangan        : SEED_RECIPES dipakai selama katalog belum diimpor ke Firestore.
 *  - Milik pengguna  : users/{uid}/recipes/{id}
 *        resep AI    : dokumen lengkap (source: "ai")
 *        penanda     : { id, source: "seed", saved?, imageUrl? } untuk resep katalog
 */
type StoredDoc = Partial<Recipe> & { id: string; source: "seed" | "ai" };

interface RecipesCtx {
  ready: boolean;
  recipes: Recipe[];
  saved: Recipe[];
  getRecipe: (id: string) => Recipe | undefined;
  toggleSave: (r: Recipe) => Promise<void>;
  setPhoto: (r: Recipe, url: string) => Promise<void>;
  addGenerated: (r: Omit<Recipe, "id">) => Promise<Recipe>;
  removeGenerated: (id: string) => Promise<void>;
}

const Ctx = createContext<RecipesCtx | null>(null);

export function RecipesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [docs, setDocs] = useState<StoredDoc[]>([]);
  const [mineReady, setMineReady] = useState(false);
  const [catalog, setCatalog] = useState<Recipe[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [imported, setImported] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setDocs([]);
      setMineReady(false);
      setCatalog([]);
      setCatalogReady(false);
      setImported(null);
      return;
    }
    const db = firestore();
    const u1 = onSnapshot(
      collection(db, "users", user.uid, "recipes"),
      (snap) => {
        setDocs(snap.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as StoredDoc));
        setMineReady(true);
      },
      () => setMineReady(true),
    );
    const u2 = onSnapshot(
      query(collection(db, "recipes"), where("status", "==", "published")),
      (snap) => {
        setCatalog(snap.docs.map((d) => ({ ...(d.data() as Recipe), id: d.id, source: "seed" as const })));
        setCatalogReady(true);
      },
      () => setCatalogReady(true),
    );
    const u3 = onSnapshot(
      doc(db, "config", "catalog"),
      (s) => setImported(!!s.data()?.imported),
      () => setImported(false),
    );
    return () => {
      u1();
      u2();
      u3();
    };
  }, [user]);

  const ready = mineReady && catalogReady && imported !== null;

  const base = useMemo(() => {
    if (imported === null) return [] as Recipe[];
    if (imported) return [...catalog].sort((a, b) => a.name.localeCompare(b.name, "id"));
    // Belum diimpor: resep bawaan di kode, ditambah resep baru dari admin, katalog menimpa id yang sama
    const byId = new Map<string, Recipe>(SEED_RECIPES.map((r) => [r.id, r]));
    for (const r of catalog) byId.set(r.id, r);
    return [...byId.values()];
  }, [imported, catalog]);

  const recipes = useMemo(() => {
    const overrides = new Map<string, StoredDoc>();
    const ai: Recipe[] = [];
    for (const d of docs) {
      if (d.source === "seed") overrides.set(d.id, d);
      else if (d.name) ai.push(d as Recipe);
    }
    ai.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const catalogRecipes = base.map((r) => {
      const o = overrides.get(r.id);
      return o ? { ...r, imageUrl: o.imageUrl ?? r.imageUrl, saved: !!o.saved } : r;
    });
    return [...ai, ...catalogRecipes];
  }, [docs, base]);

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const saved = useMemo(() => recipes.filter((r) => r.saved), [recipes]);

  const recipeRef = useCallback((id: string) => doc(firestore(), "users", user!.uid, "recipes", id), [user]);

  const toggleSave = useCallback(
    async (r: Recipe) => {
      if (!user) return;
      const next = !r.saved;
      if (r.source === "seed") {
        const cur = docs.find((d) => d.id === r.id);
        await setDoc(recipeRef(r.id), clean({ id: r.id, source: "seed", saved: next, imageUrl: cur?.imageUrl }), { merge: true });
      } else {
        await setDoc(recipeRef(r.id), { saved: next }, { merge: true });
      }
    },
    [user, docs, recipeRef],
  );

  const setPhoto = useCallback(
    async (r: Recipe, url: string) => {
      if (!user) return;
      if (r.source === "seed") {
        // Admin: foto resep katalog disimpan di katalog agar terlihat semua pengguna dan di dashboard.
        // Hanya bisa bila resep sudah ada sebagai dokumen katalog (sudah diimpor).
        if (isAdmin && imported && catalog.some((c) => c.id === r.id)) {
          await updateDoc(doc(firestore(), "recipes", r.id), { imageUrl: url, updatedAt: Date.now() });
          if (docs.some((d) => d.id === r.id && d.imageUrl)) await updateDoc(recipeRef(r.id), { imageUrl: deleteField() });
          return;
        }
        await setDoc(recipeRef(r.id), clean({ id: r.id, source: "seed", imageUrl: url }), { merge: true });
      } else {
        await setDoc(recipeRef(r.id), { imageUrl: url }, { merge: true });
      }
    },
    [user, isAdmin, imported, catalog, docs, recipeRef],
  );

  const addGenerated = useCallback(
    async (r: Omit<Recipe, "id">) => {
      if (!user) throw new Error("Belum masuk");
      const ref = doc(collection(firestore(), "users", user.uid, "recipes"));
      const full: Recipe = { ...r, id: ref.id, source: "ai", saved: false, createdAt: Date.now() };
      await setDoc(ref, clean(full));
      return full;
    },
    [user],
  );

  const removeGenerated = useCallback(
    async (id: string) => {
      if (!user) return;
      await deleteDoc(recipeRef(id));
    },
    [user, recipeRef],
  );

  const getRecipe = useCallback((id: string) => byId.get(id), [byId]);

  const value = useMemo<RecipesCtx>(
    () => ({ ready, recipes, saved, getRecipe, toggleSave, setPhoto, addGenerated, removeGenerated }),
    [ready, recipes, saved, getRecipe, toggleSave, setPhoto, addGenerated, removeGenerated],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecipes() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRecipes harus dipakai di dalam RecipesProvider");
  return c;
}
