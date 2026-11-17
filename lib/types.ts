export type Category = {
  id: string;
  name: string;
  description: string;
};

export type Supplier = {
  id: string;
  supplierCode?: string;
  name: string;
  companyName?: string;
  contactPerson: string;
  phone: string;
  whatsappNumber?: string;
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
  /** Records when the current workbook stock baseline was imported. */
  sheetStockImportedAt?: string;
  /** Identifies the workbook snapshot used for the last stock baseline import. */
  sheetStockImportVersion?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReceptionVisitStatus = "waiting_doctor" | "waiting_reception" | "medicine_issued";

export type MedicationScheduleTime = "morning" | "afternoon" | "evening" | "night";

export type StudentMedicineIssueLine = {
  medicineId: string;
  quantity: number;
  dosage: string;
  schedule: MedicationScheduleTime[];
  durationDays?: number;
};

export type PrescribedMedicine = {
  medicineId: string;
  medicineName: string;
  /** Total units dispensed; calculated from dose × times per day × days. */
  quantity: number;
  dosage: string;
  instructions: string;
  dosePerIntake?: number;
  schedule?: MedicationScheduleTime[];
  durationDays?: number;
};


/** Reception desk entry — saved patient visit sent to the doctor. */
export type ReceptionVisit = {
  id: string;
  /** Stable patient identity reused across visits when the phone number matches. */
  patientId?: string;
  /** Reception-entered patient ID reused across visits. */
  patientNumber?: string;
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
  followUpDays?: number;
  followUpDate?: string;
  prescribedAt?: string;
  /** Inventory was deducted atomically when this prescription was saved. */
  stockDeductedAt?: string;
  createdAt: string;
  createdBy: string;
  medicineIssuedAt?: string;
};

export type ReceptionVisitInput = {
  patientNumber: string;
  patientName: string;
  cnic: string;
  age: number;
  complaint: string;
  phone?: string;
};

export type SchoolStudent = {
  id: string;
  studentNumber?: string;
  studentName: string;
  schoolName: string;
  className: string;
  phone: string;
  fee: 0;
  createdAt: string;
  createdBy: string;
};

export type SchoolStudentInput = Omit<SchoolStudent, "id" | "fee" | "createdAt" | "createdBy"> & { studentNumber: string };

export type StockType = "in" | "out" | "adjustment";
export type StockMovementType = StockType | "supplier_payment";

export type StockMovement = {
  id: string;
  medicineId: string;
  medicineName: string;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  note: string;
  createdAt: string;
  createdBy: string;
  /** Rent desk item (when medicineId is empty). */
  rentItemId?: string;
  /** School student details for student-only medicine issues. */
  schoolStudentId?: string;
  schoolStudentName?: string;
  schoolName?: string;
  className?: string;
  dosage?: string;
  schedule?: MedicationScheduleTime[];
  durationDays?: number;
  issueDate?: string;
  supplierId?: string;
  supplierName?: string;
  invoiceNumber?: string;
  purchaseDate?: string;
  purchaseGroupId?: string;
  batchNumber?: string;
  purchasePrice?: number;
  salePrice?: number;
  expiryDate?: string;
  purchaseAmount?: number;
  paymentAmount?: number;
  paymentStatus?: "paid" | "partial" | "unpaid";
  saleAmount?: number;
};

export type StockPurchaseLineInput = {
  medicineId: string;
  batchNumber: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  expiryDate: string;
};

export type StockPurchaseInput = {
  supplierId: string;
  invoiceNumber: string;
  purchaseDate: string;
  line: StockPurchaseLineInput;
  amountPaid: number;
};

export type SupplierPaymentInput = {
  supplierId: string;
  invoiceNumber: string;
  amount: number;
  note?: string;
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
