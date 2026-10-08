"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AiKeyForm } from "@/components/AiKeyForm";
import { RecipeImage } from "@/components/RecipeImage";
import { Button, Chip, Notice, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { useAi } from "@/lib/ai-context";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const SLIDES = [
  { seed: "bingung", title: "Bingung mau masak apa?", text: "DapurQu membantu menemukan ide menu dari bahan yang ada di dapur, tanpa pusing mikir dari nol." },
  { seed: "bahan", title: "Dari bahan jadi menu", text: "Masukkan bahan utama, pilih masakan lokal atau luar, lalu asisten AI menyarankan beberapa menu yang cocok." },
  { seed: "resep", title: "Resep lengkap, langkah jelas", text: "Ketik nama menu untuk mendapat daftar bahan, takaran, dan cara memasak. Ada mode memasak satu langkah per layar." },
];

const TOTAL = SLIDES.length + 2; // 3 slide + profil + AI

export default function OnboardingPage() {
  const { profile, user, saveProfile } = useAuth();
  const { hasKey } = useAi();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.displayName || user?.displayName || "");
  const [servings, setServings] = useState(profile?.defaultServings ?? 4);
  const [pref, setPref] = useState<NonNullable<Profile["cuisinePref"]>>(profile?.cuisinePref ?? "Keduanya");
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    await saveProfile({ displayName: name.trim() || "Chef", defaultServings: servings, cuisinePref: pref, onboarded: true });
    router.replace("/");
  }

  const isSlide = step < SLIDES.length;
  const profileStep = step === SLIDES.length;
  const aiStep = step === SLIDES.length + 1;

  return (
    <AuthGate mode="onboard">
      <main className="flex min-h-dvh flex-col px-6 pb-8 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-7 bg-primary-600" : i < step ? "w-3 bg-primary-300" : "w-3 bg-sunken-2")} />
            ))}
          </div>
          {isSlide && (
            <button onClick={() => setStep(SLIDES.length)} className="text-[13px] font-bold text-body">
              Lewati
            </button>
          )}
        </div>

        {isSlide && (
          <>
            <div className="mt-8 aspect-[4/3] overflow-hidden rounded-[2rem]">
              <RecipeImage name={SLIDES[step].seed} />
            </div>
            <h1 className="mt-8 text-[28px] font-extrabold leading-tight text-ink">{SLIDES[step].title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-body">{SLIDES[step].text}</p>
            <div className="flex-1" />
            <Button full onClick={() => setStep(step + 1)}>
              Lanjut
            </Button>
          </>
        )}

        {profileStep && (
          <>
            <h1 className="mt-10 text-[26px] font-extrabold leading-tight text-ink">Kenalan dulu, yuk</h1>
            <p className="mb-6 mt-1.5 text-[14px] text-body">Bisa diubah kapan saja di Pengaturan.</p>
            <div className="space-y-5">
              <TextField label="Nama panggilan" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Bunda" />
              <div>
                <span className="mb-1.5 block text-[13px] font-bold text-ink">Biasanya masak untuk berapa porsi?</span>
                <div className="inline-flex items-center gap-4 rounded-2xl bg-white px-3 py-2 ring-1 ring-line">
                  <button onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Kurangi" className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary-600">
                    <Minus size={18} />
                  </button>
                  <b className="min-w-[4.5rem] text-center">{servings} porsi</b>
                  <button onClick={() => setServings((s) => Math.min(20, s + 1))} aria-label="Tambah" className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary-600">
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-[13px] font-bold text-ink">Selera masakan</span>
                <div className="flex flex-wrap gap-2">
                  {(["Keduanya", "Lokal", "Luar"] as const).map((p) => (
                    <Chip key={p} active={pref === p} onClick={() => setPref(p)}>
                      {p === "Keduanya" ? "Lokal dan luar" : p === "Lokal" ? "Lebih suka lokal" : "Lebih suka luar"}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-1" />
            <Button full onClick={() => setStep(step + 1)} className="mt-8">
              Lanjut
            </Button>
          </>
        )}

        {aiStep && (
          <>
            <h1 className="mt-10 text-[26px] font-extrabold leading-tight text-ink">Aktifkan asisten AI</h1>
            <p className="mb-5 mt-1.5 text-[14px] leading-relaxed text-body">Fitur saran menu dan resep AI memakai API key Gemini milikmu. Gratis, dan bisa dilewati dulu.</p>
            <AiKeyForm submitLabel="Simpan key" />
            {!hasKey && (
              <div className="mt-4">
                <Notice tone="warn">Tanpa API key, kamu tetap bisa menjelajah resep bawaan. Fitur AI aktif setelah key diisi di Pengaturan.</Notice>
              </div>
            )}
            <div className="flex-1" />
            <Button full onClick={finish} loading={busy} variant={hasKey ? "primary" : "secondary"} className="mt-8">
              {hasKey ? "Mulai masak" : "Lewati, isi nanti"}
            </Button>
          </>
        )}
      </main>
    </AuthGate>
  );
}
