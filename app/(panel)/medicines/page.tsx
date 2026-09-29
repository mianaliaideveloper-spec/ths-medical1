"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, EmptyState, PageHeader } from "@/components/shell";
import { MedicineNameAutocomplete } from "@/components/medicine-autocomplete";
import { MedicineListTable } from "@/components/medicine-list";
import { useStore } from "@/components/store";
import { isExpired } from "@/lib/format";
import { sortMedicinesForDisplay } from "@/lib/medicine-sort";

type ListFilter = "all" | "expired";

function MedicinesTable() {
  const params = useSearchParams();
  const { medicines, deleteMedicine } = useStore();
  const [query, setQuery] = useState(params.get("q") || "");
  const [filter, setFilter] = useState<ListFilter>(params.get("filter") === "expired" ? "expired" : "all");

  useEffect(() => {
    const q = params.get("q");
    if (q) setQuery(q);
    setFilter(params.get("filter") === "expired" ? "expired" : "all");
  }, [params]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = sortMedicinesForDisplay(medicines);
    if (filter === "expired") list = list.filter((item) => isExpired(item));
    if (!needle) return list;
    return list.filter((item) => {
      const haystack = `${item.name} ${item.genericName} ${item.strength}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [medicines, query, filter]);

  return (
    <div>
      <PageHeader
        title="All medicines"
        description="Out-of-stock items appear at the end. Use Expired items to review batches past expiry."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/medicines"
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${filter === "all" ? "bg-ths text-white" : "border border-line bg-white"}`}
            >
              All
            </Link>
            <Link
              href="/medicines?filter=expired"
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${filter === "expired" ? "bg-danger text-white" : "border border-line bg-white"}`}
            >
              Expired items
            </Link>
            <Link href="/medicines/new" className="rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white hover:bg-ths-dark">
              Add medicine
            </Link>
          </div>
        }
      />
      <Card className="mb-4 p-4">
        <MedicineNameAutocomplete
          label="Search medicine"
          medicines={medicines}
          value={query}
          onChange={setQuery}
          showAddNew
        />
      </Card>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            title={filter === "expired" ? "No expired items" : "No medicines found"}
            body={filter === "expired" ? "Nothing is past its expiry date." : "Type a name above or add a new medicine."}
          />
        ) : (
          <MedicineListTable items={rows} onDelete={(id) => setPendingId(id)} />
        )}
      </Card>
      {pendingId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <h2 className="font-semibold text-ths-dark">Delete this medicine?</h2>
            <p className="mt-2 text-sm text-muted">This batch will be removed from the inventory.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg border border-line px-3 py-2 text-sm" onClick={() => setPendingId(null)}>Cancel</button>
              <button
                className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  await deleteMedicine(pendingId);
                  setPendingId(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MedicinesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading medicines…</p>}>
      <MedicinesTable />
    </Suspense>
  );
}
