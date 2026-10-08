export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function formatTime(min: number) {
  if (min < 60) return `${min} mnt`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} jam ${m} mnt` : `${h} jam`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

/** Angka stabil per hari, dipakai untuk rekomendasi harian. */
export function daySeed(date = new Date()) {
  return date.getFullYear() * 1000 + Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
}

export function seededShuffle<T>(arr: T[], seed: number) {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}
