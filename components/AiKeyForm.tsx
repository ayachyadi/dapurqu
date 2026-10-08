"use client";

import { useState } from "react";
import { Eye, EyeOff, ExternalLink, KeyRound, Trash2 } from "lucide-react";
import { useAi } from "@/lib/ai-context";
import { AiError, DEFAULT_MODEL, MODEL_OPTIONS, testKey } from "@/lib/gemini";
import { Button, Notice, TextField } from "./ui";
import { cn } from "@/lib/utils";

/** Form API key Gemini, dipakai di Onboarding dan Pengaturan. */
export function AiKeyForm({ onSaved, submitLabel = "Simpan" }: { onSaved?: () => void; submitLabel?: string }) {
  const { settings, hasKey, save, clear } = useAi();
  const [key, setKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model || DEFAULT_MODEL);
  const [custom, setCustom] = useState(!MODEL_OPTIONS.some((m) => m.id === (settings.model || DEFAULT_MODEL)));
  const [sync, setSync] = useState(settings.sync);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"" | "test" | "save">("");
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function onTest() {
    if (!key.trim()) return setMsg({ tone: "error", text: "Isi API key dulu." });
    setBusy("test");
    setMsg(null);
    try {
      await testKey({ apiKey: key.trim(), model: model.trim() || DEFAULT_MODEL });
      setMsg({ tone: "ok", text: "Koneksi berhasil. API key dan model bisa dipakai." });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof AiError ? e.message : "Tes koneksi gagal." });
    } finally {
      setBusy("");
    }
  }

  async function onSave() {
    if (!key.trim()) return setMsg({ tone: "error", text: "Isi API key dulu." });
    setBusy("save");
    setMsg(null);
    try {
      await save({ apiKey: key, model, sync });
      setMsg({ tone: "ok", text: "Tersimpan." });
      onSaved?.();
    } catch {
      setMsg({ tone: "error", text: "Gagal menyimpan ke akun. Kunci tetap tersimpan di perangkat ini." });
    } finally {
      setBusy("");
    }
  }

  async function onClear() {
    if (!confirm("Hapus API key dari perangkat dan akun?")) return;
    await clear();
    setKey("");
    setMsg({ tone: "ok", text: "API key dihapus." });
  }

  return (
    <div className="space-y-4">
      <Notice tone="info">
        <p className="font-bold">Pakai Gemini versi gratis</p>
        <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
          <li>
            Buka{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold underline">
              aistudio.google.com/apikey <ExternalLink size={12} />
            </a>
          </li>
          <li>Masuk dengan akun Google, lalu pilih Create API key.</li>
          <li>Salin kuncinya dan tempel di bawah. Tidak perlu kartu kredit.</li>
        </ol>
      </Notice>

      <TextField
        label="API Key Gemini"
        type={show ? "text" : "password"}
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="AIza..."
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        right={
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Sembunyikan" : "Tampilkan"} className="grid h-9 w-9 place-items-center rounded-lg text-body">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />

      <div>
        <span className="mb-1.5 block text-[13px] font-bold text-ink">Model</span>
        <div className="space-y-2">
          {MODEL_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setModel(m.id);
                setCustom(false);
              }}
              className={cn("flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left", !custom && model === m.id ? "border-primary-600 bg-primary-50" : "border-line bg-white")}
            >
              <span className={cn("h-4 w-4 shrink-0 rounded-full border-2", !custom && model === m.id ? "border-primary-600 bg-primary-600 ring-2 ring-inset ring-white" : "border-line")} />
              <span>
                <span className="block text-[14px] font-bold text-ink">
                  {m.label} {m.id === DEFAULT_MODEL && <span className="ml-1 rounded-full bg-secondary-100 px-2 py-0.5 text-[10px] font-bold text-secondary-700">Disarankan</span>}
                </span>
                <span className="block text-xs text-muted">{m.note}</span>
              </span>
            </button>
          ))}
          <button type="button" onClick={() => setCustom(true)} className={cn("w-full rounded-xl border px-4 py-3 text-left text-[14px] font-bold", custom ? "border-primary-600 bg-primary-50" : "border-line bg-white")}>
            ID model lain
          </button>
          {custom && (
            <TextField value={model} onChange={(e) => setModel(e.target.value)} placeholder="contoh: gemini-3.1-flash-lite" autoCapitalize="off" spellCheck={false} hint="Nama model Google bisa berubah. Cek daftar terbaru di ai.google.dev/gemini-api/docs/models." />
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl bg-sunken p-3">
        <input type="checkbox" checked={sync} onChange={(e) => setSync(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#964118]" />
        <span className="text-[13px] leading-snug text-body">
          <b className="text-ink">Sinkronkan ke akun</b>
          <br />
          Kunci ikut tersimpan di akun DapurQu agar otomatis aktif di HP lain. Jika dimatikan, kunci hanya ada di perangkat ini.
        </span>
      </label>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <div className="flex gap-2">
        <Button variant="outlined" onClick={onTest} loading={busy === "test"} className="flex-1">
          Tes koneksi
        </Button>
        <Button onClick={onSave} loading={busy === "save"} className="flex-1">
          <KeyRound size={16} /> {submitLabel}
        </Button>
      </div>

      {hasKey && (
        <button onClick={onClear} className="mx-auto flex items-center gap-1.5 text-[13px] font-bold text-danger">
          <Trash2 size={14} /> Hapus API key
        </button>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        Catatan privasi: di tier gratis, Google dapat memakai isi permintaan untuk memperbaiki produknya. Jangan menulis data pribadi di kolom bahan atau menu. Permintaan AI dikirim langsung dari HP ke Google memakai kunci milikmu sendiri.
      </p>
    </div>
  );
}
