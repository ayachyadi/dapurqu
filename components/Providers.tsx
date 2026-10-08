"use client";

import { useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { AiProvider } from "@/lib/ai-context";
import { RecipesProvider } from "@/lib/recipes-context";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return (
    <AuthProvider>
      <AiProvider>
        <RecipesProvider>{children}</RecipesProvider>
      </AiProvider>
    </AuthProvider>
  );
}
