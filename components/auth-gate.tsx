"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "./shell";
import { useStore } from "./store";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) {
    return <p className="p-8 text-sm text-muted">Opening the store…</p>;
  }
  if (!user) return null;
  return <AppShell>{children}</AppShell>;
}
