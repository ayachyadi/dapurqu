import { CATEGORIES, type Category, type Ingredient, type Level, type Origin, type Recipe } from "./types";

/**
 * Model default: Flash-Lite generasi 3.x (gratis di free tier Google AI Studio,
 * ID resmi tertera di halaman pricing Gemini API).
 * Nama model bisa berubah. Pengguna bisa mengganti ID model di Pengaturan.
 */
export const DEFAULT_MODEL = "gemini-3.1-flash-lite";
export const MODEL_OPTIONS = [
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", note: "Disarankan: gratis, cepat, hemat kuota" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", note: "Lebih baru, cek kuota gratis di AI Studio" },
];

export interface AiCreds {
  apiKey: string;
  model: string;
}

export type AiErrorCode = "no_key" | "invalid_key" | "forbidden" | "model" | "quota" | "busy" | "network" | "blocked" | "parse" | "unknown";

export class AiError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const SYSTEM = [
  "Kamu adalah asisten koki rumahan untuk keluarga Indonesia.",
  "Gunakan bahasa Indonesia yang hangat dan jelas.",
  "Utamakan bahan yang mudah ditemukan di pasar atau supermarket Indonesia dan takaran rumahan (sdm, sdt, siung, butir, gram, ml).",
  "Jangan menggunakan tanda pisah panjang (em dash) dalam teks.",
  "Balas HANYA dengan JSON valid sesuai bentuk yang diminta, tanpa markdown dan tanpa teks lain.",
].join(" ");

async function call(creds: AiCreds, prompt: string, signal?: AbortSignal): Promise<unknown> {
  if (!creds.apiKey) throw new AiError("no_key", "API key Gemini belum diisi.");
  const model = creds.model || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
  });

  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": creds.apiKey },
        body,
        signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      throw new AiError("network", "Tidak bisa terhubung ke Gemini. Cek koneksi internet.");
    }
    if (res.status !== 503 || attempt === 1) break;
    await new Promise((r) => setTimeout(r, 1200));
  }
  if (!res) throw new AiError("unknown", "Tidak ada respons dari Gemini.");

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.message ?? "";
    } catch {}
    if (res.status === 400 && /api key/i.test(detail)) throw new AiError("invalid_key", "API key tidak valid. Periksa lagi kuncinya.");
    if (res.status === 400) throw new AiError("unknown", `Permintaan ditolak Gemini. ${detail}`.trim());
    if (res.status === 401 || res.status === 403) throw new AiError("forbidden", "API key ditolak atau belum punya akses. Buat key baru di Google AI Studio.");
    if (res.status === 404) throw new AiError("model", `Model "${model}" tidak ditemukan. Ganti ID model di Pengaturan.`);
    if (res.status === 429) throw new AiError("quota", "Kuota gratis Gemini sedang habis. Tunggu beberapa saat lalu coba lagi.");
    if (res.status >= 500) throw new AiError("busy", "Server Gemini sedang sibuk. Coba lagi sebentar.");
    throw new AiError("unknown", `Gemini mengembalikan error ${res.status}. ${detail}`.trim());
  }

  const data = await res.json();
  if (data?.promptFeedback?.blockReason) throw new AiError("blocked", "Permintaan diblokir oleh filter Gemini. Coba kata lain.");
  const text: string = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  if (!text.trim()) throw new AiError("parse", "Gemini tidak memberi jawaban. Coba lagi.");
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim());
  } catch {
    throw new AiError("parse", "Jawaban AI tidak bisa dibaca. Coba lagi.");
  }
}

/* ---------- Normalisasi ---------- */
const toLevel = (v: unknown): Level => (v === "Sedang" || v === "Sulit" ? v : "Mudah");
const toOrigin = (v: unknown, fallback: Origin): Origin => (v === "Lokal" || v === "Luar" ? v : fallback);
const toCategory = (v: unknown): Category => ((CATEGORIES as readonly string[]).includes(String(v)) ? (v as Category) : "Lainnya");
const toNum = (v: unknown, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : d;
};
const toStrArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);

/* ---------- Flow 1: saran menu dari bahan ---------- */
export interface SuggestedMenu {
  name: string;
  description: string;
  timeMinutes: number;
  level: Level;
  missing: string[];
}

export async function suggestMenus(creds: AiCreds, pantry: string[], cuisine: Origin, signal?: AbortSignal): Promise<SuggestedMenu[]> {
  const prompt =
    `Bahan utama yang tersedia di dapur: ${pantry.join(", ")}.\n` +
    `Sarankan 5 menu ${cuisine === "Lokal" ? "masakan Indonesia" : "masakan luar negeri (bukan Indonesia) yang realistis dibuat di dapur rumah Indonesia"} ` +
    `yang memakai bahan utama tersebut. Variasikan cara memasaknya. Menu harus bisa dimasak dengan bahan tersedia ditambah bahan dapur umum (bumbu dasar, minyak, garam, gula).\n` +
    `Untuk tiap menu, isi "missing" dengan daftar bahan penting yang belum ada di daftar tersedia dan bukan bumbu dasar. Jika tidak ada, isi array kosong.\n` +
    `Bentuk JSON: {"menus":[{"name":string,"description":string (satu kalimat, maksimal 120 karakter),"timeMinutes":number,"level":"Mudah"|"Sedang"|"Sulit","missing":string[]}]}`;
  const raw = (await call(creds, prompt, signal)) as { menus?: Array<Record<string, unknown>> };
  const list = Array.isArray(raw?.menus) ? raw.menus : [];
  const out = list
    .map((m) => ({
      name: String(m.name ?? "").trim(),
      description: String(m.description ?? "").trim(),
      timeMinutes: toNum(m.timeMinutes, 30),
      level: toLevel(m.level),
      missing: toStrArr(m.missing).slice(0, 3),
    }))
    .filter((m) => m.name);
  if (!out.length) throw new AiError("parse", "AI belum menemukan menu yang cocok. Coba tambah bahan lain.");
  return out.slice(0, 6);
}

/* ---------- Flow 2: resep lengkap dari nama menu ---------- */
export async function generateRecipe(
  creds: AiCreds,
  name: string,
  servings: number,
  hint?: { origin?: Origin },
  signal?: AbortSignal,
): Promise<Omit<Recipe, "id">> {
  const prompt =
    `Buat resep lengkap untuk menu: "${name}" untuk ${servings} porsi.\n` +
    `Kelompokkan bahan dengan "group", contoh: "Bahan Utama", "Bumbu Halus", "Pelengkap". Langkah ditulis singkat dan jelas, 5 sampai 10 langkah. ` +
    `"nutrition" adalah perkiraan per porsi (kkal, protein gram, karbohidrat gram). "tools" adalah peralatan masak yang dibutuhkan.\n` +
    `Bentuk JSON: {"name":string,"description":string (satu kalimat),"origin":"Lokal"|"Luar","category":${CATEGORIES.map((c) => `"${c}"`).join("|")},` +
    `"timeMinutes":number,"level":"Mudah"|"Sedang"|"Sulit","servings":number,"ingredients":[{"item":string,"qty":string,"group":string}],"steps":string[],"tips":string,"tools":string[],` +
    `"nutrition":{"kcal":number,"protein":number,"carbs":number}}`;
  const r = (await call(creds, prompt, signal)) as Record<string, unknown>;
  const ingredients: Ingredient[] = (Array.isArray(r.ingredients) ? (r.ingredients as Array<Record<string, unknown>>) : [])
    .map((i) => ({ item: String(i.item ?? "").trim(), qty: String(i.qty ?? "").trim(), group: String(i.group ?? "Bahan-bahan").trim() || "Bahan-bahan" }))
    .filter((i) => i.item);
  const steps = toStrArr(r.steps);
  if (!ingredients.length || !steps.length) throw new AiError("parse", "Resep dari AI belum lengkap. Coba generate lagi.");
  const n = (r.nutrition ?? null) as Record<string, unknown> | null;
  return {
    name: String(r.name ?? name).trim() || name,
    description: String(r.description ?? "").trim(),
    origin: toOrigin(r.origin, hint?.origin ?? "Lokal"),
    category: toCategory(r.category),
    timeMinutes: toNum(r.timeMinutes, 30),
    level: toLevel(r.level),
    servings: toNum(r.servings, servings),
    ingredients,
    steps,
    tips: String(r.tips ?? "").trim() || undefined,
    tools: toStrArr(r.tools),
    nutrition: n ? { kcal: toNum(n.kcal, 0), protein: toNum(n.protein, 0), carbs: toNum(n.carbs, 0) } : undefined,
    source: "ai",
  };
}

/** Uji koneksi ringan untuk tombol "Tes koneksi" di Pengaturan. */
export async function testKey(creds: AiCreds): Promise<void> {
  const r = (await call(creds, 'Balas JSON persis: {"ok":true}')) as { ok?: boolean };
  if (!r?.ok) throw new AiError("parse", "Koneksi berhasil tetapi jawaban tidak sesuai. Coba lagi.");
}

/* ---------- Dashboard admin: isi formulir dari teks resep ---------- */
export async function extractRecipe(
  creds: AiCreds,
  text: string,
  signal?: AbortSignal,
): Promise<Omit<Recipe, "id"> & { estimated: boolean }> {
  const prompt =
    `Ekstrak resep dari teks berikut ke JSON. Pertahankan nama bahan dan takaran persis seperti di teks, jangan menambah atau mengubah bahan. ` +
    `Kelompokkan bahan dengan "group" bila teks punya kelompok (misalnya Bumbu Halus), jika tidak pakai "Bahan Utama". ` +
    `Tulis ulang langkah secara singkat dan jelas dengan urutan yang sama. Jika teks tidak memuat langkah, isi "steps" dengan array kosong. ` +
    `Jika waktu, tingkat kesulitan, asal, kategori, atau deskripsi tidak ada di teks, perkirakan dan isi "estimated": true, jika semuanya ada di teks isi false.\n` +
    `Bentuk JSON: {"name":string,"description":string (satu kalimat),"origin":"Lokal"|"Luar","category":${CATEGORIES.map((c) => `"${c}"`).join("|")},` +
    `"timeMinutes":number,"level":"Mudah"|"Sedang"|"Sulit","servings":number,"ingredients":[{"item":string,"qty":string,"group":string}],"steps":string[],"tips":string,"tools":string[],"estimated":boolean}\n\n` +
    `TEKS RESEP:\n"""\n${text.slice(0, 12000)}\n"""`;
  const r = (await call(creds, prompt, signal)) as Record<string, unknown>;
  const ingredients: Ingredient[] = (Array.isArray(r.ingredients) ? (r.ingredients as Array<Record<string, unknown>>) : [])
    .map((i) => ({ item: String(i.item ?? "").trim(), qty: String(i.qty ?? "").trim() || "secukupnya", group: String(i.group ?? "Bahan Utama").trim() || "Bahan Utama" }))
    .filter((i) => i.item);
  if (!ingredients.length) throw new AiError("parse", "AI tidak menemukan daftar bahan di teks itu. Cek isi teksnya.");
  return {
    name: String(r.name ?? "").trim(),
    description: String(r.description ?? "").trim(),
    origin: toOrigin(r.origin, "Lokal"),
    category: toCategory(r.category),
    timeMinutes: toNum(r.timeMinutes, 30),
    level: toLevel(r.level),
    servings: toNum(r.servings, 4),
    ingredients,
    steps: toStrArr(r.steps),
    tips: String(r.tips ?? "").trim() || undefined,
    tools: toStrArr(r.tools),
    estimated: r.estimated !== false,
    source: "seed",
  };
}
