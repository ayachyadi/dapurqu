export type Origin = "Lokal" | "Luar";
export type Level = "Mudah" | "Sedang" | "Sulit";
export const CATEGORIES = [
  "Ayam",
  "Daging",
  "Ikan & Seafood",
  "Sayur",
  "Telur",
  "Tahu & Tempe",
  "Nasi & Mie",
  "Camilan",
  "Dessert & Kue",
  "Lainnya",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Ingredient {
  item: string;
  qty: string;
  group?: string;
}

export interface Nutrition {
  kcal: number;
  protein: number;
  carbs: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  origin: Origin;
  category: Category;
  timeMinutes: number;
  level: Level;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];
  tips?: string;
  tools?: string[];
  nutrition?: Nutrition; // estimasi AI per porsi
  imageUrl?: string;
  source: "seed" | "ai";
  saved?: boolean;
  createdAt?: number;
  /** Sumber resep bawaan, ditampilkan di halaman resep. */
  credit?: string;
  /** true bila waktu, tingkat kesulitan, dan deskripsi adalah perkiraan, bukan dari sumber. */
  estimated?: boolean;
  /** Catatan khusus yang ditampilkan di halaman resep (misalnya bagian yang disusun ulang). */
  note?: string;
  /** Katalog: hanya "published" yang terlihat di aplikasi. */
  status?: "draft" | "published";
  /** Penanda admin: resep sudah dicek dan dicoba. Hanya tampil di dashboard. */
  verified?: boolean;
  updatedAt?: number;
}

export interface Profile {
  displayName?: string;
  email?: string;
  photoURL?: string;
  onboarded?: boolean;
  defaultServings?: number;
  cuisinePref?: "Lokal" | "Luar" | "Keduanya";
}
