"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { panelNavLinks } from "@/lib/nav";
import { useStore } from "./store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-ths-dark text-white transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-5" onClick={() => setOpen(false)}>
          <Image src="/logo.png" alt="Taleem-o-Hunar Society logo" width={56} height={56} className="h-14 w-14 max-w-none rounded-full bg-white object-contain" />
          <span>
            <span className="block text-sm font-semibold leading-tight">Taleem-o-Hunar</span>
            <span className="block text-xs text-white/75">Medical Center Store</span>
          </span>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {panelNavLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm ${
                  active ? "bg-white text-ths-dark font-semibold" : "text-white/90 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <button
            className="rounded-lg border border-line px-3 py-2 text-sm lg:hidden"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
          <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:ml-0 lg:flex-1 lg:justify-end">
            <Link
              href="/profile"
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ths-dark hover:bg-ths-soft"
            >
              Profile
            </Link>
            <button
              type="button"
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ths-dark hover:bg-ths-soft"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ths-dark">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-white shadow-sm ${className}`}>{children}</section>;
}

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  hint: string;
  href: string;
  tone?: "blue" | "green" | "amber" | "red";
}) {
  const tones = {
    blue: "bg-clinic-soft text-clinic-dark",
    green: "bg-ths-soft text-ths-dark",
    amber: "bg-amber-50 text-warning",
    red: "bg-red-50 text-danger",
  };
  return (
    <Link href={href} className="rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{hint}</p>
    </Link>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ths-dark">{label}</span>
      {children}
    </label>
  );
}

export const fieldClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none ring-clinic/30 focus:border-clinic focus:ring-2";

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ok: "bg-ths-soft text-ths-dark",
    low: "bg-amber-50 text-warning",
    out: "bg-red-50 text-danger",
    expired: "bg-red-100 text-danger",
    expiring: "bg-clinic-soft text-clinic-dark",
  };
  const labels: Record<string, string> = {
    ok: "In stock",
    low: "Low stock",
    out: "Out of stock",
    expired: "Expired",
    expiring: "Expiring soon",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] || styles.ok}`}>
      {labels[status] || status}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-medium text-ths-dark">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{children}</p>;
}
