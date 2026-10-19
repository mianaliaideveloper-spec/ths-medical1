import { readDeskSession, writeDeskSession, type DeskSession } from "./desk";

/** Single store login — no sign-up. Change via env if needed. */
export const FIXED_AUTH_UID = "local-ths-fixed-admin";

export const FIXED_AUTH_USERNAME =
  process.env.NEXT_PUBLIC_STORE_USERNAME?.trim() || "thsmedical3@gmail.com";

export const FIXED_AUTH_PASSWORD =
  process.env.NEXT_PUBLIC_STORE_PASSWORD || "THSmedical3";

export const FIXED_AUTH_NAME = "THS Medical";

export function isFixedStoreUser(uid: string | undefined) {
  return uid === FIXED_AUTH_UID;
}

export function verifyFixedCredentials(username: string, password: string) {
  const id = username.trim().toLowerCase();
  const allowed =
    id === FIXED_AUTH_USERNAME.toLowerCase() || id === "ths";
  return allowed && password === FIXED_AUTH_PASSWORD;
}

export function openFixedDeskSession(): DeskSession {
  const existing = readDeskSession();
  const session: DeskSession = {
    uid: FIXED_AUTH_UID,
    email: FIXED_AUTH_USERNAME,
    name: existing?.uid === FIXED_AUTH_UID ? existing.name : FIXED_AUTH_NAME,
    photoURL: existing?.uid === FIXED_AUTH_UID ? existing.photoURL : undefined,
  };
  writeDeskSession(session);
  return session;
}
