"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "./firebase";
import { useAuth } from "./auth-context";
import { DEFAULT_MODEL } from "./gemini";

export interface AiSettings {
  apiKey: string;
  model: string;
  /** true: kunci disimpan juga di akun (users/{uid}/private/ai) agar sinkron antar perangkat */
  sync: boolean;
}

interface AiCtx {
  settings: AiSettings;
  hasKey: boolean;
  ready: boolean;
  save: (s: AiSettings) => Promise<void>;
  clear: () => Promise<void>;
}

const LOCAL_KEY = "dapurqu.ai.v1";
const EMPTY: AiSettings = { apiKey: "", model: DEFAULT_MODEL, sync: true };

const Ctx = createContext<AiCtx | null>(null);

function readLocal(): AiSettings {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<AiSettings>) };
  } catch {}
  return EMPTY;
}

export function AiProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AiSettings>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setSettings(EMPTY);
      setReady(false);
      return;
    }
    setSettings(readLocal());
    setReady(true);
    return onSnapshot(
      doc(firestore(), "users", user.uid, "private", "ai"),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data() as Partial<AiSettings>;
        if (!d.apiKey) return;
        const next: AiSettings = { apiKey: d.apiKey, model: d.model || DEFAULT_MODEL, sync: true };
        setSettings(next);
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        } catch {}
      },
      () => {},
    );
  }, [user]);

  const save = useCallback(
    async (s: AiSettings) => {
      const next = { ...s, apiKey: s.apiKey.trim(), model: s.model.trim() || DEFAULT_MODEL };
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      } catch {}
      setSettings(next);
      if (!user) return;
      const ref = doc(firestore(), "users", user.uid, "private", "ai");
      if (next.sync && next.apiKey) {
        await setDoc(ref, { apiKey: next.apiKey, model: next.model, updatedAt: serverTimestamp() });
      } else {
        await deleteDoc(ref).catch(() => {});
      }
    },
    [user],
  );

  const clear = useCallback(async () => {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {}
    setSettings(EMPTY);
    if (user) await deleteDoc(doc(firestore(), "users", user.uid, "private", "ai")).catch(() => {});
  }, [user]);

  const value = useMemo<AiCtx>(() => ({ settings, hasKey: !!settings.apiKey, ready, save, clear }), [settings, ready, save, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAi() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAi harus dipakai di dalam AiProvider");
  return c;
}
