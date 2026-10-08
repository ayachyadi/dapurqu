import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function firebaseApp() {
  if (!_app) _app = getApps().length ? getApp() : initializeApp(config);
  return _app;
}

export function firebaseAuth() {
  if (!_auth) _auth = getAuth(firebaseApp());
  return _auth;
}

export function firestore() {
  if (_db) return _db;
  try {
    _db =
      typeof window !== "undefined"
        ? initializeFirestore(firebaseApp(), {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
          })
        : getFirestore(firebaseApp());
  } catch {
    _db = getFirestore(firebaseApp());
  }
  return _db;
}
