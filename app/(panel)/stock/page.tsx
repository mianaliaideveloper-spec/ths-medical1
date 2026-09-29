"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Stock page removed — quantity is updated on Add/Edit medicine. */
export default function StockRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/medicines");
  }, [router]);
  return <p className="text-sm text-muted">Redirecting to medicines…</p>;
}
