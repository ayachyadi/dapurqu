import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Notice } from "./ui";

export function NeedKey() {
  return (
    <Notice tone="warn">
      <div className="flex items-start gap-3">
        <KeyRound size={18} className="mt-0.5 shrink-0" />
        <p>
          Fitur ini butuh API key Gemini.{" "}
          <Link href="/pengaturan" className="font-extrabold underline">
            Isi di Pengaturan
          </Link>{" "}
          (gratis, sekitar satu menit).
        </p>
      </div>
    </Notice>
  );
}
