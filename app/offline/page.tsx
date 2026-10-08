import { Logo } from "@/components/Logo";

export default function Offline() {
  return (
    <main className="grid min-h-dvh place-items-center px-8 text-center">
      <div className="flex flex-col items-center">
        <Logo size={64} className="mb-4" />
        <h1 className="text-2xl font-extrabold text-primary-600">Kamu sedang offline</h1>
        <p className="mt-2 text-sm text-body">Sambungkan internet untuk memakai fitur AI atau memuat resep terbaru. Resep yang pernah dibuka biasanya tetap bisa dilihat.</p>
      </div>
    </main>
  );
}
