import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import type { FirebaseWebConfig } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyBMj5s44DWtML-WglJaMC8oK8O51bk-ckk",
  authDomain: "ths-medical1.firebaseapp.com",
  projectId: "ths-medical1",
  storageBucket: "ths-medical1.firebasestorage.app",
  messagingSenderId: "908971561444",
  appId: "1:908971561444:web:90b608f85d8eed8286b7f1",
  measurementId: "G-HXXK8FXL0E",
};

export const CONFIG_STORAGE_KEY = "ths-medical-firebase-config";

const envConfig = (): FirebaseWebConfig | null => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !appId) return null;
  return {
    apiKey,
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      "ths-medical1.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ths-medical1",
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      "ths-medical1.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId,
  };
};

export function readStoredConfig(): FirebaseWebConfig | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FirebaseWebConfig;
    if (!parsed.apiKey || !parsed.appId || !parsed.projectId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredConfig(config: FirebaseWebConfig) {
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function resolveFirebaseConfig(): FirebaseWebConfig {
  return envConfig() ?? readStoredConfig() ?? firebaseConfig;
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebase() {
  const config = resolveFirebaseConfig();
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
    db = getFirestore(app);
  }
  return { app, db: db! };
}

export function resetFirebase() {
  app = null;
  db = null;
}
