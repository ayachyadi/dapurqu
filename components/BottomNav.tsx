"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Home, LayoutGrid, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/ai-masak", label: "AI Masak", icon: LayoutGrid },
  { href: "/resep-ai", label: "Resep AI", icon: Sparkles },
  { href: "/tersimpan", label: "Tersimpan", icon: Bookmark },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line bg-white/95 backdrop-blur">
      <ul className="grid grid-cols-4 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.4rem)] pt-1.5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className={cn("flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-bold", active ? "text-primary-600" : "text-muted")}>
                <span className={cn("grid h-8 w-12 place-items-center rounded-full transition", active && "bg-primary-100")}>
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
