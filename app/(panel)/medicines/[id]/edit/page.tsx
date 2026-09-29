"use client";

import { useParams } from "next/navigation";
import { MedicineForm } from "@/components/medicine-form";
import { PageHeader } from "@/components/shell";
import { useStore } from "@/components/store";

export default function EditMedicinePage() {
  const params = useParams<{ id: string }>();
  const { medicines } = useStore();
  const medicine = medicines.find((item) => item.id === params.id);

  if (!medicine) return <p className="text-sm text-muted">This medicine is not in the inventory.</p>;

  return (
    <div>
      <PageHeader title={`Edit ${medicine.name}`} description="Update the batch record. Use Stock to receive or issue quantity." />
      <MedicineForm medicine={medicine} />
    </div>
  );
}
