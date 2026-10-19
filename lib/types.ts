export type Category = {
  id: string;
  name: string;
  description: string;
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
};

export type Medicine = {
  id: string;
  name: string;
  genericName: string;
  categoryId: string;
  categoryName: string;
  manufacturer: string;
  strength: string;
  strengthValue: number;
  strengthUnit: string;
  manufacturingDate: string;
  batchNumber: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  reorderLevel: number;
  expiryDate: string;
  supplierId: string;
  supplierName: string;
  /** Store label on bills (auto: THS Medical Center). */
  storeLabel: string;
  unit: string;
  /** Tablets in one strip (tablet & capsule items). */
  tabletsPerStrip: number;
  /** Suggested tablets per dose (optional). */
  doseTablets: number;
  shelf: string;
  createdAt: string;
  updatedAt: string;
};

export type ReceptionVisitStatus = "waiting_doctor" | "waiting_reception" | "medicine_issued";

export type PrescribedMedicine = {
  medicineId: string;
  medicineName: string;
  quantity: number;
  dosage: string;
  instructions: string;
};


/** Reception desk entry — saved patient visit sent to the doctor. */
export type ReceptionVisit = {
  id: string;
  /** Daily queue number (1 = first slip of the day). */
  tokenNumber: number;
  slipNumber: string;
  patientName: string;
  cnic: string;
  age: number;
  complaint: string;
  phone: string;
  slipFee: number;
  status: ReceptionVisitStatus;
  prescription?: PrescribedMedicine[];
  doctorNote?: string;
  prescribedAt?: string;
  createdAt: string;
  createdBy: string;
  medicineIssuedAt?: string;
};

export type ReceptionVisitInput = {
  patientName: string;
  cnic: string;
  age: number;
  complaint: string;
  phone?: string;
};

export type StockType = "in" | "out" | "adjustment";

export type StockMovement = {
  id: string;
  medicineId: string;
  medicineName: string;
  type: StockType;
  quantity: number;
  balanceAfter: number;
  note: string;
  createdAt: string;
  createdBy: string;
  /** Rent desk item (when medicineId is empty). */
  rentItemId?: string;
};

/** Rentable items (wheelchair, nebulizer, etc.) — stock minus on customer bill. */
export type RentItem = {
  id: string;
  name: string;
  rentPrice: number;
  quantity: number;
  unit: string;
  note: string;
  updatedAt: string;
};

export type RentItemInput = Omit<RentItem, "id" | "updatedAt">;

export type BillIssueSummary = {
  kind: "medicine" | "rent";
  name: string;
  issued: number;
  unit: string;
  balanceAfter: number;
};

export type AdminProfile = {
  uid: string;
  email: string;
  name: string;
  role: "admin";
  createdAt: string;
  photoURL?: string;
};

export type ProfileUpdateInput = {
  name: string;
  email: string;
  currentPassword: string;
  newPassword?: string;
  photoURL?: string;
};

export type MedicineInput = Omit<Medicine, "id" | "createdAt" | "updatedAt">;

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};
