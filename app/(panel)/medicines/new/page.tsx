"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MedicineForm } from "@/components/medicine-form";
import { PageHeader } from "@/components/shell";

function NewMedicineForm() {
  const params = useSearchParams();
  const initialName = params.get("name") || "";
  return <MedicineForm initialName={initialName} />;
}

export default function NewMedicinePage() {
  return (
    <div>
      <PageHeader
        title="Add medicine"
        description="Pick a name from suggestions or type your own. Add strength (mg), dates, prices, and quantity."
      />
      <Suspense fallback={<p className="text-sm text-muted">Loading form…</p>}>
        <NewMedicineForm />
      </Suspense>
    </div>
  );
}
