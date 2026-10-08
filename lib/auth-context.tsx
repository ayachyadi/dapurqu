"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth, firestore } from "./firebase";
import type { Profile } from "./types";
import { clean } from "./utils";

interface AuthCtx {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  google: () => Promise<void>;
  logout: () => Promise<void>;
  saveProfile: (patch: Partial<Profile>) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth(), (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        setProfile(null);
        setProfileReady(true);
      } else {
        setProfileReady(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(firestore(), "users", user.uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as Profile) : {});
        setProfileReady(true);
      },
      () => {
        setProfile({});
        setProfileReady(true);
      },
    );
  }, [user]);

  const saveProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return;
      await setDoc(doc(firestore(), "users", user.uid), clean(patch), { merge: true });
    },
    [user],
  );

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(firestore(), "users", cred.user.uid), {
      displayName: name,
      email,
      onboarded: false,
      createdAt: serverTimestamp(),
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(firebaseAuth(), email, password);
  }, []);

  const google = useCallback(async () => {
    const cred = await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
    const ref = doc(firestore(), "users", cred.user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(
        ref,
        clean({
          displayName: cred.user.displayName ?? "",
          email: cred.user.email ?? "",
          photoURL: cred.user.photoURL ?? undefined,
          onboarded: false,
          createdAt: serverTimestamp(),
        }),
      );
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(firebaseAuth());
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ user, profile, loading: !authReady || !profileReady, signUp, signIn, google, logout, saveProfile }),
    [user, profile, authReady, profileReady, signUp, signIn, google, logout, saveProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return c;
}

export function authMessage(e: unknown) {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-email": "Format email belum benar.",
    "auth/missing-password": "Password belum diisi.",
    "auth/weak-password": "Password minimal 6 karakter.",
    "auth/email-already-in-use": "Email ini sudah terdaftar. Coba masuk saja.",
    "auth/invalid-credential": "Email atau password salah.",
    "auth/user-not-found": "Email belum terdaftar.",
    "auth/wrong-password": "Email atau password salah.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
    "auth/network-request-failed": "Koneksi internet bermasalah.",
    "auth/popup-closed-by-user": "Jendela Google ditutup sebelum selesai.",
    "auth/cancelled-popup-request": "Jendela Google ditutup sebelum selesai.",
    "auth/popup-blocked": "Popup diblokir browser. Izinkan popup lalu coba lagi.",
    "auth/operation-not-allowed": "Metode masuk ini belum diaktifkan di Firebase Console.",
    "auth/unauthorized-domain": "Domain aplikasi belum didaftarkan di Firebase Authentication (Authorized domains).",
  };
  return map[code] ?? "Terjadi kendala. Coba lagi sebentar.";
}
