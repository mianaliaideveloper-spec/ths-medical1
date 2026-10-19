"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SecretInput } from "@/components/secret-input";
import { Field, Notice, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await login(username.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      const code = err instanceof Error ? err.message : "Sign-in failed.";
      setError(
        code.includes("incorrect") ? "Email or password is incorrect." : code,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Image
        src="/logo.png"
        alt=""
        fill
        priority
        className="object-cover object-center scale-110 blur-[2px]"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-ths-dark/75" aria-hidden />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/95 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <Image
              src="/logo.png"
              alt="Taleem-o-Hunar Medical Center"
              width={88}
              height={88}
              className="h-20 w-20 rounded-full bg-white object-contain ring-4 ring-ths-soft"
            />
            <h1 className="mt-4 text-2xl font-semibold text-ths-dark">THS Medical</h1>
            <p className="mt-1 text-sm text-muted">Taleem-o-Hunar Medical Center · Medicine store</p>
          </div>

          <h2 className="text-lg font-semibold text-ths-dark">Login</h2>
          <p className="mt-1 text-sm text-muted">Email and password are required every time you open the desk.</p>

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <Field label="Email">
              <input
                className={fieldClass}
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="thsmedical3@gmail.com"
                required
              />
            </Field>
            <SecretInput
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              maxLength={64}
            />
            {error && <Notice>{error}</Notice>}
            <button
              disabled={busy}
              className="w-full rounded-lg bg-clinic px-4 py-2.5 text-sm font-semibold text-white hover:bg-clinic-dark disabled:opacity-60"
            >
              {busy ? "Please wait…" : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
