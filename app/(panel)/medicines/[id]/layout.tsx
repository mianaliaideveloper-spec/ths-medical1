/** Prebuilds the dynamic route so hosts serve /medicines/* correctly (client loads data by id). */
export function generateStaticParams() {
  return [{ id: "item" }];
}

export const dynamicParams = true;

export default function MedicineIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
