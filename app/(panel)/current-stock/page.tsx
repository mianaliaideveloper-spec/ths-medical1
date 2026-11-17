"use client";

import { useMemo, useState } from "react";
import { Card, PageHeader, StatusBadge, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";
import { inventorySummary } from "@/components/store";
import { formatDate, formatPkr, stockQuantity, stockStatus } from "@/lib/format";
import { sortMedicinesForDisplay } from "@/lib/medicine-sort";

export default function CurrentStockPage() {
  const { medicines } = useStore();
  const [query, setQuery] = useState("");
  const summary = inventorySummary(medicines);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = sortMedicinesForDisplay(medicines);
    if (!needle) return list;
    return list.filter((item) => `${item.name} ${item.manufacturer} ${item.genericName} ${item.batchNumber} ${item.supplierName}`.toLowerCase().includes(needle));
  }, [medicines, query]);

  return (
    <div>
      <PageHeader title="Stock Status" description={`${summary.availableSkus} in-date medicine batches · ${summary.availableUnits} usable units.`} />
      <Card className="mb-4 p-4">
        <input
          className={fieldClass}
          placeholder="Search name, brand, generic, batch or supplier…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Card>
      <Card className="overflow-hidden">
        <div className="table-wrap"><table className="data"><thead><tr><th>Medicine</th><th>Brand</th><th>Generic</th><th>Batch</th><th>Available qty</th><th>Purchase price</th><th>Selling price</th><th>Expiry</th><th>Supplier</th><th>Status</th></tr></thead><tbody>
          {rows.map((item) => <tr key={item.id}><td className="font-medium">{item.name}<span className="block text-xs text-muted">{item.strength}</span></td><td>{item.manufacturer || "—"}</td><td>{item.genericName || "—"}</td><td>{item.batchNumber || "—"}</td><td>{stockQuantity(item)} {item.unit}</td><td>{formatPkr(item.purchasePrice)}</td><td>{formatPkr(item.salePrice)}</td><td>{formatDate(item.expiryDate)}</td><td>{item.supplierName || "—"}</td><td><StatusBadge status={stockStatus(item)} /></td></tr>)}
        </tbody></table>{rows.length === 0 && <p className="px-4 py-6 text-sm text-muted">No matching medicine batches.</p>}</div>
      </Card>
    </div>
  );
}
