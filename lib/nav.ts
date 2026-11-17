/** Main desk navigation. Stock entry pages stay grouped under Stock Status. */
export const mainNavLinks = [
  { href: "/dashboard", label: "Dashboard" },
  {
    href: "/reception",
    label: "Reception",
    children: [
      { href: "/reception", label: "Patient Register" },
      { href: "/medicine-issue", label: "Patient Medicine Issue" },
    ],
  },
  {
    href: "/school-students",
    label: "THS Student",
    children: [
      { href: "/school-students", label: "Student Register" },
      { href: "/student-medicine-issue", label: "Student Medicine Issue" },
    ],
  },
  {
    href: "/current-stock",
    label: "Stock Status",
    children: [
      { href: "/current-stock", label: "Current Stock" },
      { href: "/stock-in", label: "Stock In" },
      { href: "/medicines", label: "Medicine Master" },
    ],
  },
  { href: "/low-stock-report", label: "Low Stock Report" },
  { href: "/expiry-report", label: "Expiry Report" },
  { href: "/clinic-list", label: "Clinic List" },
] as const;

export const deskNavLinks = [
  { href: "/rent", label: "Rent" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/reports", label: "Export reports" },
] as const;

export const panelNavLinks = [...mainNavLinks, ...deskNavLinks] as const;
