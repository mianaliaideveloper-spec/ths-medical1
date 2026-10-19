/** Main desk navigation (matches clinic spreadsheet tabs). */
export const mainNavLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/medicines", label: "Medicine Master" },
  { href: "/stock-in", label: "Stock In" },
  { href: "/reception", label: "Patient Register" },
  { href: "/doctor", label: "Doctor Prescriptions" },
  { href: "/clinic-list", label: "Sheet1" },
  { href: "/current-stock", label: "Current Stock" },
  { href: "/low-stock-report", label: "Low Stock Report" },
  { href: "/expiry-report", label: "Expiry Report" },
] as const;

export const deskNavLinks = [
  { href: "/rent", label: "Rent" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Export reports" },
] as const;

export const panelNavLinks = [...mainNavLinks, ...deskNavLinks] as const;
