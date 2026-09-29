"use client";

import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearDeskSession,
  isLocalAdmin,
  readDeskAccount,
  readDeskData,
  readDeskSession,
  writeDeskData,
  type DeskSession,
} from "@/lib/desk";
import {
  FIXED_AUTH_NAME,
  FIXED_AUTH_PASSWORD,
  FIXED_AUTH_USERNAME,
  isFixedStoreUser,
  openFixedDeskSession,
  verifyFixedCredentials,
} from "@/lib/fixed-auth";
import { getFirebase, resolveFirebaseConfig } from "@/lib/firebase";
import { prepareMedicineForSave } from "@/lib/medicine-save";
import {
  nextSlipNumber,
  nextTokenNumber,
  normalizeReceptionVisits,
  RECEPTION_SLIP_FEE_PKR,
} from "@/lib/reception";
import {
  isExpired,
  isExpiringSoon,
  isLowStock,
  isOutOfStock,
} from "@/lib/format";
import type {
  AdminProfile,
  Category,
  Medicine,
  MedicineInput,
  ProfileUpdateInput,
  ReceptionVisit,
  ReceptionVisitInput,
  StockMovement,
  StockType,
  Supplier,
} from "@/lib/types";

type StoreContextValue = {
  ready: boolean;
  configured: boolean;
  user: DeskSession | null;
  admin: AdminProfile | null;
  authError: string;
  medicines: Medicine[];
  categories: Category[];
  suppliers: Supplier[];
  movements: StockMovement[];
  receptionVisits: ReceptionVisit[];
  registerReceptionVisit: (input: ReceptionVisitInput) => Promise<ReceptionVisit>;
  markReceptionMedicineIssued: (id: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
  saveMedicine: (input: MedicineInput, id?: string) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  saveCategory: (input: Omit<Category, "id">, id?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveSupplier: (input: Omit<Supplier, "id">, id?: string) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  adjustStock: (
    medicineId: string,
    type: StockType,
    quantity: number,
    note: string,
  ) => Promise<void>;
  syncLocalInventory: (data: ReturnType<typeof readDeskData>) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function openLocalSession(
  session: DeskSession,
  setUser: (value: DeskSession) => void,
  setAdmin: (value: AdminProfile) => void,
  setMedicines: (value: Medicine[]) => void,
  setCategories: (value: Category[]) => void,
  setSuppliers: (value: Supplier[]) => void,
  setMovements: (value: StockMovement[]) => void,
  setReceptionVisits: (value: ReceptionVisit[]) => void,
) {
  const data = readDeskData();
  const account = readDeskAccount(session.uid);
  setUser(session);
  setAdmin({
    uid: session.uid,
    email: session.email,
    name: session.name,
    role: "admin",
    createdAt: account?.createdAt || new Date().toISOString(),
    photoURL: session.photoURL ?? account?.photoURL,
  });
  setMedicines(data.medicines);
  setCategories(data.categories);
  setSuppliers(data.suppliers);
  setMovements(data.movements);
  setReceptionVisits(normalizeReceptionVisits(data.receptionVisits ?? []));
}

function mapDoc<T>(id: string, data: Record<string, unknown>): T {
  return { id, ...data } as T;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<DeskSession | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [authError, setAuthError] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [receptionVisits, setReceptionVisits] = useState<ReceptionVisit[]>([]);

  useEffect(() => {
    setConfigured(Boolean(resolveFirebaseConfig()));
    const desk = readDeskSession();
    if (desk && isFixedStoreUser(desk.uid)) {
      const data = readDeskData();
      setUser(desk);
      setAdmin({
        uid: desk.uid,
        email: desk.email,
        name: desk.name,
        role: "admin",
        createdAt: "",
        photoURL: desk.photoURL,
      });
      setMedicines(data.medicines);
      setCategories(data.categories);
      setSuppliers(data.suppliers);
      setMovements(data.movements);
      setReceptionVisits(normalizeReceptionVisits(data.receptionVisits ?? []));
      setReady(true);
      return;
    }
    if (desk) clearDeskSession();
    void (async () => {
      try {
        const firebase = getFirebase();
        await signOut(firebase.auth);
      } catch {
        /* ignore */
      }
      setUser(null);
      setAdmin(null);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    const firebase = getFirebase();
    if (!firebase || !user || isLocalAdmin(user.uid)) return;
    const unsubMeds = onSnapshot(collection(firebase.db, "medicines"), (snap) => {
      setMedicines(
        snap.docs
          .map((item) => mapDoc<Medicine>(item.id, item.data()))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
    const unsubCats = onSnapshot(collection(firebase.db, "categories"), (snap) => {
      setCategories(
        snap.docs
          .map((item) => mapDoc<Category>(item.id, item.data()))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
    const unsubSuppliers = onSnapshot(collection(firebase.db, "suppliers"), (snap) => {
      setSuppliers(
        snap.docs
          .map((item) => mapDoc<Supplier>(item.id, item.data()))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
    const unsubMoves = onSnapshot(collection(firebase.db, "stockMovements"), (snap) => {
      setMovements(
        snap.docs
          .map((item) => mapDoc<StockMovement>(item.id, item.data()))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    });
    const unsubReception = onSnapshot(collection(firebase.db, "receptionVisits"), (snap) => {
      setReceptionVisits(
        normalizeReceptionVisits(
          snap.docs
            .map((item) => mapDoc<ReceptionVisit>(item.id, item.data()))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      );
    });
    return () => {
      unsubMeds();
      unsubCats();
      unsubSuppliers();
      unsubMoves();
      unsubReception();
    };
  }, [user]);

  const value = useMemo<StoreContextValue>(() => {
    const firebaseOrThrow = () => {
      const firebase = getFirebase();
      if (!firebase) throw new Error("Firebase is not configured.");
      return firebase;
    };

    return {
      ready,
      configured,
      user,
      admin,
      authError,
      medicines,
      categories,
      suppliers,
      movements,
      receptionVisits,
      syncLocalInventory(data) {
        setMedicines(data.medicines);
        setCategories(data.categories);
        setSuppliers(data.suppliers);
        setMovements(data.movements);
        setReceptionVisits(normalizeReceptionVisits(data.receptionVisits ?? []));
      },
      async registerReceptionVisit(input) {
        const now = new Date().toISOString();
        const tokenNumber = nextTokenNumber(receptionVisits);
        const visit: ReceptionVisit = {
          id: crypto.randomUUID(),
          tokenNumber,
          slipNumber: nextSlipNumber(receptionVisits),
          patientName: input.patientName.trim(),
          cnic: input.cnic.trim(),
          age: Math.max(0, Math.floor(Number(input.age))),
          complaint: input.complaint.trim(),
          phone: input.phone?.trim() || "",
          slipFee: RECEPTION_SLIP_FEE_PKR,
          status: "waiting_doctor",
          createdAt: now,
          createdBy: user?.email || admin?.name || "reception",
        };
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          data.receptionVisits = [visit, ...(data.receptionVisits ?? [])];
          writeDeskData(data);
          setReceptionVisits(normalizeReceptionVisits(data.receptionVisits ?? []));
          return visit;
        }
        const firebase = firebaseOrThrow();
        const { id: _id, ...payload } = visit;
        const ref = await addDoc(collection(firebase.db, "receptionVisits"), payload);
        const saved = { ...visit, id: ref.id };
        setReceptionVisits((current) => [saved, ...current]);
        return saved;
      },
      async markReceptionMedicineIssued(id) {
        const issuedAt = new Date().toISOString();
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          data.receptionVisits = (data.receptionVisits ?? []).map((item) =>
            item.id === id
              ? { ...item, status: "medicine_issued" as const, medicineIssuedAt: issuedAt }
              : item,
          );
          writeDeskData(data);
          setReceptionVisits(normalizeReceptionVisits(data.receptionVisits ?? []));
          return;
        }
        const firebase = firebaseOrThrow();
        await updateDoc(doc(firebase.db, "receptionVisits", id), {
          status: "medicine_issued",
          medicineIssuedAt: issuedAt,
        });
      },
      async login(email, password) {
        setAuthError("");
        if (!verifyFixedCredentials(email, password)) {
          throw new Error("Username or password is incorrect.");
        }
        try {
          const firebase = getFirebase();
          await signOut(firebase.auth);
        } catch {
          /* ignore */
        }
        const session = openFixedDeskSession();
        openLocalSession(
          session,
          setUser,
          setAdmin,
          setMedicines,
          setCategories,
          setSuppliers,
          setMovements,
          setReceptionVisits,
        );
      },
      async register() {
        throw new Error("Sign-up is not available. Use the store username and password.");
      },
      async logout() {
        clearDeskSession();
        setUser(null);
        setAdmin(null);
        const firebase = getFirebase();
        if (firebase) await signOut(firebase.auth).catch(() => undefined);
      },
      async updateProfile(input: ProfileUpdateInput) {
        if (!user) throw new Error("Not signed in.");
        if (input.currentPassword !== FIXED_AUTH_PASSWORD) {
          throw new Error("Current password is incorrect.");
        }
        let photo = admin?.photoURL;
        if (input.photoURL === "") photo = undefined;
        else if (input.photoURL) photo = input.photoURL;

        const session: DeskSession = {
          uid: user.uid,
          email: FIXED_AUTH_USERNAME,
          name: input.name.trim() || FIXED_AUTH_NAME,
          photoURL: photo,
        };
        window.localStorage.setItem("ths-desk-session", JSON.stringify(session));
        setUser(session);
        setAdmin({
          uid: session.uid,
          email: session.email,
          name: session.name,
          role: "admin",
          createdAt: admin?.createdAt || "",
          photoURL: session.photoURL,
        });
      },
      async saveMedicine(input, id) {
        const existing = id ? medicines.find((item) => item.id === id) : undefined;
        const payload = prepareMedicineForSave(input, existing);
        if (isLocalAdmin(user?.uid)) {
          const now = new Date().toISOString();
          const data = readDeskData();
          data.medicines = id
            ? data.medicines.map((item) => (item.id === id ? { ...item, ...payload, updatedAt: now } : item))
            : [...data.medicines, { ...payload, id: crypto.randomUUID(), createdAt: now, updatedAt: now }];
          data.medicines.sort((a, b) => a.name.localeCompare(b.name));
          writeDeskData(data);
          setMedicines(data.medicines);
          return;
        }
        const firebase = firebaseOrThrow();
        const now = new Date().toISOString();
        if (id) {
          await updateDoc(doc(firebase.db, "medicines", id), { ...payload, updatedAt: now });
          return;
        }
        await addDoc(collection(firebase.db, "medicines"), {
          ...payload,
          createdAt: now,
          updatedAt: now,
        });
      },
      async deleteMedicine(id) {
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          data.medicines = data.medicines.filter((item) => item.id !== id);
          writeDeskData(data);
          setMedicines(data.medicines);
          return;
        }
        const firebase = firebaseOrThrow();
        await deleteDoc(doc(firebase.db, "medicines", id));
      },
      async saveCategory(input, id) {
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          if (id) {
            data.categories = data.categories.map((item) => (item.id === id ? { ...item, ...input } : item));
            data.medicines = data.medicines.map((item) =>
              item.categoryId === id ? { ...item, categoryName: input.name } : item,
            );
          } else {
            data.categories.push({ ...input, id: crypto.randomUUID() });
          }
          data.categories.sort((a, b) => a.name.localeCompare(b.name));
          writeDeskData(data);
          setCategories(data.categories);
          setMedicines(data.medicines);
          return;
        }
        const firebase = firebaseOrThrow();
        if (id) {
          await updateDoc(doc(firebase.db, "categories", id), input);
          const related = medicines.filter((item) => item.categoryId === id);
          await Promise.all(
            related.map((item) =>
              updateDoc(doc(firebase.db, "medicines", item.id), {
                categoryName: input.name,
              }),
            ),
          );
          return;
        }
        await addDoc(collection(firebase.db, "categories"), input);
      },
      async deleteCategory(id) {
        if (medicines.some((item) => item.categoryId === id)) {
          throw new Error("Move or delete medicines in this category first.");
        }
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          data.categories = data.categories.filter((item) => item.id !== id);
          writeDeskData(data);
          setCategories(data.categories);
          return;
        }
        const firebase = firebaseOrThrow();
        await deleteDoc(doc(firebase.db, "categories", id));
      },
      async saveSupplier(input, id) {
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          if (id) {
            data.suppliers = data.suppliers.map((item) => (item.id === id ? { ...item, ...input } : item));
            data.medicines = data.medicines.map((item) =>
              item.supplierId === id ? { ...item, supplierName: input.name } : item,
            );
          } else {
            data.suppliers.push({ ...input, id: crypto.randomUUID() });
          }
          data.suppliers.sort((a, b) => a.name.localeCompare(b.name));
          writeDeskData(data);
          setSuppliers(data.suppliers);
          setMedicines(data.medicines);
          return;
        }
        const firebase = firebaseOrThrow();
        if (id) {
          await updateDoc(doc(firebase.db, "suppliers", id), input);
          const related = medicines.filter((item) => item.supplierId === id);
          await Promise.all(
            related.map((item) =>
              updateDoc(doc(firebase.db, "medicines", item.id), {
                supplierName: input.name,
              }),
            ),
          );
          return;
        }
        await addDoc(collection(firebase.db, "suppliers"), input);
      },
      async deleteSupplier(id) {
        if (medicines.some((item) => item.supplierId === id)) {
          throw new Error("Reassign medicines from this supplier first.");
        }
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          data.suppliers = data.suppliers.filter((item) => item.id !== id);
          writeDeskData(data);
          setSuppliers(data.suppliers);
          return;
        }
        const firebase = firebaseOrThrow();
        await deleteDoc(doc(firebase.db, "suppliers", id));
      },
      async adjustStock(medicineId, type, quantity, note) {
        if (!Number.isFinite(quantity) || quantity < 0 || (type !== "adjustment" && quantity === 0)) {
          throw new Error("Enter a quantity greater than zero.");
        }
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          const medicine = data.medicines.find((item) => item.id === medicineId);
          if (!medicine) throw new Error("Medicine was not found.");
          let next = medicine.quantity;
          if (type === "in") next += quantity;
          if (type === "out") next -= quantity;
          if (type === "adjustment") next = quantity;
          if (next < 0) throw new Error("Issue quantity is higher than available stock.");
          const now = new Date().toISOString();
          data.medicines = data.medicines.map((item) =>
            item.id === medicineId ? { ...item, quantity: next, updatedAt: now } : item,
          );
          data.movements = [
            {
              id: crypto.randomUUID(),
              medicineId,
              medicineName: medicine.name,
              type,
              quantity,
              balanceAfter: next,
              note: note.trim(),
              createdAt: now,
              createdBy: user?.email || "admin",
            },
            ...data.movements,
          ];
          writeDeskData(data);
          setMedicines(data.medicines);
          setMovements(data.movements);
          return;
        }
        const firebase = firebaseOrThrow();
        await runTransaction(firebase.db, async (tx) => {
          const ref = doc(firebase.db, "medicines", medicineId);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error("Medicine was not found.");
          const current = Number(snap.data().quantity) || 0;
          const name = String(snap.data().name);
          let next = current;
          if (type === "in") next = current + quantity;
          if (type === "out") next = current - quantity;
          if (type === "adjustment") next = quantity;
          if (next < 0) throw new Error("Issue quantity is higher than available stock.");
          const now = new Date().toISOString();
          tx.update(ref, { quantity: next, updatedAt: now });
          const moveRef = doc(collection(firebase.db, "stockMovements"));
          tx.set(moveRef, {
            medicineId,
            medicineName: name,
            type,
            quantity,
            balanceAfter: next,
            note: note.trim(),
            createdAt: now,
            createdBy: user?.email || "admin",
          });
        });
      },
    };
  }, [
    admin,
    authError,
    categories,
    configured,
    medicines,
    movements,
    receptionVisits,
    ready,
    suppliers,
    user,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}

export function inventorySummary(medicines: Medicine[]) {
  const available = medicines.filter((item) => !isExpired(item) && item.quantity > 0);
  return {
    total: medicines.length,
    availableUnits: available.reduce((sum, item) => sum + item.quantity, 0),
    availableSkus: available.length,
    low: medicines.filter((item) => !isExpired(item) && (isLowStock(item) || isOutOfStock(item))).length,
    expired: medicines.filter((item) => isExpired(item)).length,
    expiring: medicines.filter((item) => isExpiringSoon(item) && item.quantity > 0).length,
    purchaseValue: available.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0),
    saleValue: available.reduce((sum, item) => sum + item.quantity * item.salePrice, 0),
  };
}
