"use client";

import type { DocumentData, QuerySnapshot, Transaction } from "firebase/firestore";

type FirestoreApi = typeof import("firebase/firestore");
let firestoreApi: FirestoreApi | null = null;

async function loadFirestoreApi() {
  firestoreApi ??= await import("firebase/firestore");
  return firestoreApi;
}

async function loadFirebaseClient() {
  const { getFirebase } = await import("@/lib/firebase");
  return getFirebase();
}

function collection(...args: unknown[]): ReturnType<FirestoreApi["collection"]> {
  if (!firestoreApi) throw new Error("Database is still loading. Try again in a moment.");
  return Reflect.apply(firestoreApi.collection, firestoreApi, args) as ReturnType<FirestoreApi["collection"]>;
}

function deleteDoc(...args: unknown[]): ReturnType<FirestoreApi["deleteDoc"]> {
  if (!firestoreApi) throw new Error("Database is still loading. Try again in a moment.");
  return Reflect.apply(firestoreApi.deleteDoc, firestoreApi, args) as ReturnType<FirestoreApi["deleteDoc"]>;
}

function doc(...args: unknown[]): ReturnType<FirestoreApi["doc"]> {
  if (!firestoreApi) throw new Error("Database is still loading. Try again in a moment.");
  return Reflect.apply(firestoreApi.doc, firestoreApi, args) as ReturnType<FirestoreApi["doc"]>;
}

function onSnapshot(...args: unknown[]): ReturnType<FirestoreApi["onSnapshot"]> {
  if (!firestoreApi) throw new Error("Database is still loading. Try again in a moment.");
  return Reflect.apply(firestoreApi.onSnapshot, firestoreApi, args) as ReturnType<FirestoreApi["onSnapshot"]>;
}

function runTransaction(...args: unknown[]): ReturnType<FirestoreApi["runTransaction"]> {
  if (!firestoreApi) throw new Error("Database is still loading. Try again in a moment.");
  return Reflect.apply(firestoreApi.runTransaction, firestoreApi, args) as ReturnType<FirestoreApi["runTransaction"]>;
}

function updateDoc(...args: unknown[]): ReturnType<FirestoreApi["updateDoc"]> {
  if (!firestoreApi) throw new Error("Database is still loading. Try again in a moment.");
  return Reflect.apply(firestoreApi.updateDoc, firestoreApi, args) as ReturnType<FirestoreApi["updateDoc"]>;
}

function addDoc(...args: unknown[]): ReturnType<FirestoreApi["addDoc"]> {
  if (!firestoreApi) throw new Error("Database is still loading. Try again in a moment.");
  return Reflect.apply(firestoreApi.addDoc, firestoreApi, args) as ReturnType<FirestoreApi["addDoc"]>;
}
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
  writeDeskSession,
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
import { prepareMedicineForSave } from "@/lib/medicine-save";
import {
  applyThsInStockDefaults,
  buildThsSheetMedicineRows,
  ensureThsSheetCategories,
  ensureThsSheetSupplier,
  isThsCatalogMedicineName,
  restockThsCatalogMedicines,
  THS_SHEET_SUPPLIER_NAME,
  thsSheetCatalogSize,
} from "@/lib/ths-sheet-inventory";
import {
  nextSlipNumber,
  nextTokenNumber,
  normalizeReceptionVisits,
  RECEPTION_SLIP_FEE_PKR,
  validateReceptionInput,
} from "@/lib/reception";
import {
  daysUntil,
  isExpired,
  isExpiringSoon,
  isLowStock,
  isOutOfStock,
} from "@/lib/format";
import { applyCustomerBillStockLocal } from "@/lib/issue-customer-bill";
import type { BillCartRow } from "@/lib/bill";
import type {
  AdminProfile,
  BillIssueSummary,
  Category,
  Medicine,
  MedicineInput,
  ProfileUpdateInput,
  PrescribedMedicine,
  ReceptionVisit,
  ReceptionVisitInput,
  RentItem,
  RentItemInput,
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
  rentItems: RentItem[];
  registerReceptionVisit: (input: ReceptionVisitInput) => Promise<ReceptionVisit>;
  markReceptionMedicineIssued: (id: string) => Promise<void>;
  saveReceptionPrescription: (id: string, prescription: PrescribedMedicine[], doctorNote: string) => Promise<void>;
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
  saveRentItem: (input: RentItemInput, id?: string) => Promise<void>;
  deleteRentItem: (id: string) => Promise<void>;
  issueCustomerBill: (rows: BillCartRow[]) => Promise<BillIssueSummary[]>;
  syncLocalInventory: (data: ReturnType<typeof readDeskData>) => void;
  importThsSheetCatalog: () => Promise<{ added: number; total: number; catalogSize: number }>;
  markThsCatalogInStock: () => Promise<{ updated: number }>;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function inventoryRevision(medicines: Medicine[]) {
  return medicines.map((item) => `${item.id}:${item.updatedAt}:${item.quantity}`).join("|");
}

function openLocalSession(
  session: DeskSession,
  setUser: (value: DeskSession) => void,
  setAdmin: (value: AdminProfile) => void,
  setMedicines: (value: Medicine[]) => void,
  setCategories: (value: Category[]) => void,
  setSuppliers: (value: Supplier[]) => void,
  setMovements: (value: StockMovement[]) => void,
  setReceptionVisits: (value: ReceptionVisit[]) => void,
  setRentItems: (value: RentItem[]) => void,
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
  setRentItems((data.rentItems ?? []).sort((a, b) => a.name.localeCompare(b.name)));
}

function mapDoc<T>(id: string, data: Record<string, unknown>): T {
  return { id, ...data } as T;
}

function withoutId<T extends { id: string }>(item: T): Omit<T, "id"> {
  const { id, ...payload } = item;
  void id;
  return payload;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [configured] = useState(true);
  const [user, setUser] = useState<DeskSession | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [authError, setAuthError] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [receptionVisits, setReceptionVisits] = useState<ReceptionVisit[]>([]);
  const [rentItems, setRentItems] = useState<RentItem[]>([]);

  // Restore the local desk session once before enabling protected pages.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
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
      setRentItems((data.rentItems ?? []).sort((a, b) => a.name.localeCompare(b.name)));
      setReady(true);
      return;
    }
    if (desk) clearDeskSession();
    setUser(null);
    setAdmin(null);
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!user || isLocalAdmin(user.uid)) return;
    let active = true;
    const unsubscribers: Array<() => void> = [];
    void Promise.all([loadFirebaseClient(), loadFirestoreApi()]).then(([firebase]) => {
      if (!active) return;
      const unsubMeds = onSnapshot(collection(firebase.db, "medicines"), (snap: QuerySnapshot<DocumentData>) => {
        setMedicines(
          snap.docs
            .map((item) => mapDoc<Medicine>(item.id, item.data()))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      });
      const unsubCats = onSnapshot(collection(firebase.db, "categories"), (snap: QuerySnapshot<DocumentData>) => {
        setCategories(
          snap.docs
            .map((item) => mapDoc<Category>(item.id, item.data()))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      });
      const unsubSuppliers = onSnapshot(collection(firebase.db, "suppliers"), (snap: QuerySnapshot<DocumentData>) => {
        setSuppliers(
          snap.docs
            .map((item) => mapDoc<Supplier>(item.id, item.data()))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      });
      const unsubMoves = onSnapshot(collection(firebase.db, "stockMovements"), (snap: QuerySnapshot<DocumentData>) => {
        setMovements(
          snap.docs
            .map((item) => mapDoc<StockMovement>(item.id, item.data()))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      });
      const unsubReception = onSnapshot(collection(firebase.db, "receptionVisits"), (snap: QuerySnapshot<DocumentData>) => {
        setReceptionVisits(
          normalizeReceptionVisits(
            snap.docs
              .map((item) => mapDoc<ReceptionVisit>(item.id, item.data()))
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          ),
        );
      });
      unsubscribers.push(unsubMeds, unsubCats, unsubSuppliers, unsubMoves, unsubReception);
    }).catch((error: unknown) => {
      console.error("Could not connect to the medicine database.", error);
    });
    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user]);

  const value = useMemo<StoreContextValue>(() => {
    const firebaseOrThrow = async () => {
      const [firebase] = await Promise.all([loadFirebaseClient(), loadFirestoreApi()]);
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
      async saveReceptionPrescription(id, prescription, doctorNote) {
        const prescribedAt = new Date().toISOString();
        const update = (item: ReceptionVisit) => item.id === id
          ? { ...item, prescription, doctorNote: doctorNote.trim(), prescribedAt, status: "waiting_reception" as const }
          : item;
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          data.receptionVisits = (data.receptionVisits ?? []).map(update);
          writeDeskData(data);
          setReceptionVisits(normalizeReceptionVisits(data.receptionVisits ?? []));
          return;
        }
        const firebase = await firebaseOrThrow();
        await updateDoc(doc(firebase.db, "receptionVisits", id), {
          prescription, doctorNote: doctorNote.trim(), prescribedAt, status: "waiting_reception",
        });
      },
      rentItems,
      syncLocalInventory(data) {
        setMedicines((current) =>
          inventoryRevision(current) === inventoryRevision(data.medicines) ? current : data.medicines,
        );
        setCategories((current) =>
          current.length === data.categories.length &&
          current.every((item, index) => item.id === data.categories[index]?.id)
            ? current
            : data.categories,
        );
        setSuppliers((current) =>
          current.length === data.suppliers.length &&
          current.every((item, index) => item.id === data.suppliers[index]?.id)
            ? current
            : data.suppliers,
        );
        setMovements((current) =>
          current.length === data.movements.length &&
          current.every((item, index) => item.id === data.movements[index]?.id)
            ? current
            : data.movements,
        );
        setReceptionVisits((current) => {
          const next = normalizeReceptionVisits(data.receptionVisits ?? []);
          return current.length === next.length &&
            current.every(
              (item, index) =>
                item.id === next[index]?.id && item.status === next[index]?.status,
            )
            ? current
            : next;
        });
        setRentItems((current) => {
          const next = (data.rentItems ?? []).sort((a, b) => a.name.localeCompare(b.name));
          return current.length === next.length &&
            current.every((item, index) => item.id === next[index]?.id && item.quantity === next[index]?.quantity)
            ? current
            : next;
        });
      },
      async importThsSheetCatalog() {
        const catalogSize = thsSheetCatalogSize();

        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          data.categories = ensureThsSheetCategories(data.categories);
          const supplier = ensureThsSheetSupplier(data.suppliers);
          if (!data.suppliers.some((item) => item.id === supplier.id)) {
            data.suppliers.push(supplier);
          }
          const newRows = buildThsSheetMedicineRows(data.medicines, data.categories, supplier);
          data.medicines = [...data.medicines, ...newRows];
          const restocked = restockThsCatalogMedicines(data.medicines);
          data.medicines = restocked.medicines.sort((a, b) => a.name.localeCompare(b.name));
          writeDeskData(data);
          setCategories(data.categories);
          setSuppliers(data.suppliers);
          setMedicines(data.medicines);
          return { added: newRows.length, total: data.medicines.length, catalogSize };
        }

        const firebase = await firebaseOrThrow();
        const categoryByName = new Map(categories.map((item) => [item.name, item]));
        for (const cat of ensureThsSheetCategories([...categoryByName.values()])) {
          if (categoryByName.has(cat.name)) continue;
          const ref = await addDoc(collection(firebase.db, "categories"), {
            name: cat.name,
            description: cat.description,
          });
          categoryByName.set(cat.name, { id: ref.id, name: cat.name, description: cat.description });
        }
        const nextCategories = [...categoryByName.values()].sort((a, b) => a.name.localeCompare(b.name));
        setCategories(nextCategories);

        let supplier = suppliers.find((item) => item.name === THS_SHEET_SUPPLIER_NAME);
        if (!supplier) {
          const draft = ensureThsSheetSupplier([]);
          const ref = await addDoc(collection(firebase.db, "suppliers"), {
            name: draft.name,
            contactPerson: draft.contactPerson,
            phone: draft.phone,
            email: draft.email,
            address: draft.address,
            city: draft.city,
          });
          supplier = { ...draft, id: ref.id };
          setSuppliers((current) => [...current, supplier!].sort((a, b) => a.name.localeCompare(b.name)));
        }

        const newRows = buildThsSheetMedicineRows(medicines, nextCategories, supplier);
        for (const row of newRows) {
          const payload = withoutId(row);
          await addDoc(collection(firebase.db, "medicines"), payload);
        }
        return { added: newRows.length, total: medicines.length + newRows.length, catalogSize };
      },
      async markThsCatalogInStock() {
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          const restocked = restockThsCatalogMedicines(data.medicines);
          if (restocked.count === 0) return { updated: 0 };
          data.medicines = restocked.medicines.sort((a, b) => a.name.localeCompare(b.name));
          writeDeskData(data);
          setMedicines(data.medicines);
          return { updated: restocked.count };
        }

        const firebase = await firebaseOrThrow();
        let updated = 0;
        for (const med of medicines) {
          if (!isThsCatalogMedicineName(med.name)) continue;
          const needsQty = med.quantity <= 0;
          const needsExpiry = !med.expiryDate || daysUntil(med.expiryDate) < 0;
          if (!needsQty && !needsExpiry) continue;
          const next = applyThsInStockDefaults(med);
          await updateDoc(doc(firebase.db, "medicines", med.id), {
            quantity: next.quantity,
            manufacturingDate: next.manufacturingDate,
            expiryDate: next.expiryDate,
            updatedAt: next.updatedAt,
          });
          updated += 1;
        }
        return { updated };
      },
      async registerReceptionVisit(input) {
        const validated = validateReceptionInput(input);
        const now = new Date().toISOString();
        const tokenNumber = nextTokenNumber(receptionVisits);
        const visit: ReceptionVisit = {
          id: crypto.randomUUID(),
          tokenNumber,
          slipNumber: nextSlipNumber(receptionVisits),
          patientName: validated.patientName,
          cnic: validated.cnic,
          age: validated.age,
          complaint: validated.complaint,
          phone: validated.phone,
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
        const firebase = await firebaseOrThrow();
        const payload = withoutId(visit);
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
        const firebase = await firebaseOrThrow();
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
          setRentItems,
        );
      },
      async register() {
        throw new Error("Sign-up is not available. Use the store username and password.");
      },
      async logout() {
        clearDeskSession();
        setUser(null);
        setAdmin(null);
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
        writeDeskSession(session);
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
        const firebase = await firebaseOrThrow();
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
        const firebase = await firebaseOrThrow();
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
        const firebase = await firebaseOrThrow();
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
        const firebase = await firebaseOrThrow();
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
        const firebase = await firebaseOrThrow();
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
        const firebase = await firebaseOrThrow();
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
        const firebase = await firebaseOrThrow();
        await runTransaction(firebase.db, async (tx: Transaction) => {
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
      async saveRentItem(input, id) {
        const payload = {
          name: input.name.trim(),
          rentPrice: Math.max(0, Number(input.rentPrice) || 0),
          quantity: Math.max(0, Math.floor(Number(input.quantity) || 0)),
          unit: input.unit.trim() || "unit",
          note: input.note.trim(),
        };
        if (!payload.name) throw new Error("Enter a rent item name.");
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          const now = new Date().toISOString();
          const list = data.rentItems ?? [];
          data.rentItems = id
            ? list.map((item) => (item.id === id ? { ...item, ...payload, updatedAt: now } : item))
            : [...list, { ...payload, id: crypto.randomUUID(), updatedAt: now }];
          data.rentItems.sort((a, b) => a.name.localeCompare(b.name));
          writeDeskData(data);
          setRentItems(data.rentItems);
          return;
        }
        throw new Error("Rent items are saved on this desk only (local login).");
      },
      async deleteRentItem(id) {
        if (isLocalAdmin(user?.uid)) {
          const data = readDeskData();
          data.rentItems = (data.rentItems ?? []).filter((item) => item.id !== id);
          writeDeskData(data);
          setRentItems(data.rentItems);
          return;
        }
        throw new Error("Rent items are saved on this desk only (local login).");
      },
      async issueCustomerBill(rows) {
        const note = "Customer bill";
        if (!isLocalAdmin(user?.uid)) {
          throw new Error("Bill saving with stock update is available on the store desk login on this computer.");
        }
        const data = readDeskData();
        const result = applyCustomerBillStockLocal(data, rows, user?.email || "admin", note);
        writeDeskData(result.data);
        setMedicines(result.data.medicines);
        setMovements(result.data.movements);
        setRentItems(result.data.rentItems ?? []);
        return result.summary;
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
    rentItems,
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

