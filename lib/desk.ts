import type { Category, Medicine, ReceptionVisit, RentItem, StockMovement, Supplier } from "./types";

const ACCOUNTS_KEY = "ths-desk-accounts";
const SESSION_KEY = "ths-desk-session";
const DATA_KEY = "ths-desk-data";
const SCHEMA_KEY = "ths-desk-schema";
const SCHEMA_VERSION = "no-demo-v2";

export type DeskSession = {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
};

type DeskAccount = DeskSession & {
  passwordHash: string;
  createdAt: string;
};

export type DeskData = {
  medicines: Medicine[];
  categories: Category[];
  suppliers: Supplier[];
  movements: StockMovement[];
  receptionVisits: ReceptionVisit[];
  rentItems: RentItem[];
};

const emptyData = (): DeskData => ({
  medicines: [],
  categories: [],
  suppliers: [],
  movements: [],
  receptionVisits: [],
  rentItems: [],
});

async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function readAccounts(): DeskAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) || "[]") as DeskAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: DeskAccount[]) {
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function readDeskAccount(uid: string) {
  return readAccounts().find((item) => item.uid === uid);
}

export function enrichDeskSession(session: DeskSession): DeskSession {
  const account = readDeskAccount(session.uid);
  if (!account) return session;
  return {
    uid: session.uid,
    email: account.email,
    name: account.name,
    photoURL: account.photoURL,
  };
}

export function writeDeskSession(session: DeskSession) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.localStorage.removeItem(SESSION_KEY);
}

export function readDeskSession(): DeskSession | null {
  if (typeof window === "undefined") return null;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return enrichDeskSession(JSON.parse(raw) as DeskSession);
  } catch {
    return null;
  }
}

export function clearDeskSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}

function migrateDeskDataOnce() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SCHEMA_KEY) === SCHEMA_VERSION) return;
  window.localStorage.setItem(DATA_KEY, JSON.stringify(emptyData()));
  window.localStorage.setItem(SCHEMA_KEY, SCHEMA_VERSION);
}

export function readDeskData(): DeskData {
  if (typeof window === "undefined") return emptyData();
  migrateDeskDataOnce();
  try {
    return { ...emptyData(), ...(JSON.parse(window.localStorage.getItem(DATA_KEY) || "{}") as DeskData) };
  } catch {
    return emptyData();
  }
}

export function writeDeskData(data: DeskData) {
  window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export function isLocalAdmin(uid: string | undefined) {
  return Boolean(uid?.startsWith("local-"));
}

export async function registerDeskAdmin(name: string, email: string, password: string) {
  const accounts = readAccounts();
  const normalized = email.trim().toLowerCase();
  if (accounts.some((account) => account.email === normalized)) {
    throw new Error("That email already has an account. Sign in instead.");
  }
  const session: DeskSession = {
    uid: `local-${crypto.randomUUID()}`,
    email: normalized,
    name: name.trim(),
  };
  accounts.push({
    ...session,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  });
  writeAccounts(accounts);
  writeDeskSession(session);
  return session;
}

export function deskHasAccounts() {
  return readAccounts().length > 0;
}

export async function loginDeskAdmin(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase();
  const account = readAccounts().find(
    (item) =>
      item.email === normalized ||
      item.name.trim().toLowerCase() === normalized,
  );
  if (!account || account.passwordHash !== (await hashPassword(password))) {
    throw new Error("Email or password is incorrect.");
  }
  const session: DeskSession = {
    uid: account.uid,
    email: account.email,
    name: account.name,
    photoURL: account.photoURL,
  };
  writeDeskSession(session);
  return session;
}

export async function updateDeskAccount(
  uid: string,
  input: {
    name: string;
    email: string;
    currentPassword: string;
    newPassword?: string;
    photoURL?: string;
  },
) {
  const accounts = readAccounts();
  const index = accounts.findIndex((item) => item.uid === uid);
  if (index < 0) throw new Error("Account not found on this computer.");

  const account = accounts[index];
  if (account.passwordHash !== (await hashPassword(input.currentPassword))) {
    throw new Error("Current password is incorrect.");
  }

  const normalized = input.email.trim().toLowerCase();
  if (accounts.some((item, i) => i !== index && item.email === normalized)) {
    throw new Error("That username or email is already in use.");
  }

  const nextPasswordHash = input.newPassword?.trim()
    ? await hashPassword(input.newPassword.trim())
    : account.passwordHash;

  const updated: DeskAccount = {
    ...account,
    name: input.name.trim() || account.name,
    email: normalized,
    passwordHash: nextPasswordHash,
    photoURL: input.photoURL !== undefined ? input.photoURL : account.photoURL,
  };

  accounts[index] = updated;
  writeAccounts(accounts);

  const session: DeskSession = {
    uid: updated.uid,
    email: updated.email,
    name: updated.name,
    photoURL: updated.photoURL,
  };
  writeDeskSession(session);
  return session;
}
