"use client";

import { useMemo, useState } from "react";
import { Card, PageHeader, fieldClass } from "@/components/shell";
import { MedicineListTable } from "@/components/medicine-list";
import { useStore } from "@/components/store";
import { inventorySummary } from "@/components/store";
import { sortMedicinesForDisplay } from "@/lib/medicine-sort";

export default function CurrentStockPage() {
  const { medicines } = useStore();
  const [query, setQuery] = useState("");
  const summary = inventorySummary(medicines);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = sortMedicinesForDisplay(medicines);
    if (!needle) return list;
    return list.filter((item) => `${item.name} ${item.genericName}`.toLowerCase().includes(needle));
  }, [medicines, query]);

  return (
    <div>
      <PageHeader
        title="Current Stock"
        description={`${summary.availableSkus} items in stock · ${summary.availableUnits} total units on hand.`}
      />
      <Card className="mb-4 p-4">
        <input
          className={fieldClass}
          placeholder="Search medicine…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Card>
      <Card className="overflow-hidden">
        <MedicineListTable items={rows} compact />
      </Card>
    </div>
  );
}
