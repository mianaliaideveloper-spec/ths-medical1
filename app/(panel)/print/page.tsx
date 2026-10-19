"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/medicines");
  }, [router]);
  return <p className="text-sm text-muted">Opening Medicine Master…</p>;
}
