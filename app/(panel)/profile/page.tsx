"use client";

import { useState } from "react";
import { SecretInput } from "@/components/secret-input";
import { Card, Field, Notice, PageHeader, fieldClass } from "@/components/shell";
import { useStore } from "@/components/store";

const MAX_PHOTO_BYTES = 350_000;

async function readPhotoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a JPG or PNG image.");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Image is too large. Use a photo under about 350 KB.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { admin, user, updateProfile } = useStore();
  const [name, setName] = useState(admin?.name || user?.name || "");
  const [email] = useState(admin?.email || user?.email || "");
  const [photoURL, setPhotoURL] = useState(admin?.photoURL ?? user?.photoURL ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);

  async function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setSaved("");
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setPhotoURL(await readPhotoFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use that image.");
    }
    event.target.value = "";
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSaved("");
    if (!currentPassword) {
      setError("Enter your current password to save changes.");
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        currentPassword,
        photoURL: photoURL || "",
      });
      setCurrentPassword("");
      setSaved("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile.");
    } finally {
      setBusy(false);
    }
  }

  const initials = (name || email || "?")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Update your display name and photo. Username and password are fixed for the store."
      />
      <Card className="mx-auto max-w-xl p-6">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoURL}
                alt=""
                className="h-24 w-24 rounded-full border border-line object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-ths-soft text-xl font-semibold text-ths-dark">
                {initials}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-ths-soft">
                Upload photo
                <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
              </label>
              {photoURL && (
                <button
                  type="button"
                  className="rounded-lg border border-line px-3 py-2 text-sm hover:bg-ths-soft"
                  onClick={() => setPhotoURL("")}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          <Field label="Display name">
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </Field>

          <Field label="Username">
            <input className={`${fieldClass} bg-ths-soft/50`} type="text" value={email} readOnly />
          </Field>

          <SecretInput
            label="Store password (required to save)"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />

          {error && <Notice>{error}</Notice>}
          {saved && (
            <p className="rounded-lg bg-ths-soft px-3 py-2 text-sm text-ths-dark">{saved}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-ths px-4 py-2.5 text-sm font-semibold text-white hover:bg-ths-dark disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      </Card>
      <p className="mx-auto mt-4 max-w-xl text-center text-xs text-muted">
        Photos and display name are saved on this computer for the store login.
      </p>
    </div>
  );
}
