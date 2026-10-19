"use client";

import { useId, useState } from "react";
import { Field, fieldClass } from "@/components/shell";

type SecretInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Allow only digits (for numeric access codes). */
  digitsOnly?: boolean;
  maxLength?: number;
  autoComplete?: string;
};

export function SecretInput({
  label,
  value,
  onChange,
  placeholder,
  digitsOnly = false,
  maxLength = 32,
  autoComplete = "off",
}: SecretInputProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  function handleChange(raw: string) {
    if (digitsOnly) {
      onChange(raw.replace(/\D/g, "").slice(0, maxLength));
      return;
    }
    onChange(raw.slice(0, maxLength));
  }

  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          id={id}
          className={`${fieldClass} min-w-0 flex-1 font-mono tracking-wide`}
          type={visible ? "text" : "password"}
          inputMode={digitsOnly ? "numeric" : "text"}
          autoComplete={autoComplete}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
        />
        <button
          type="button"
          className="shrink-0 rounded-lg border border-line px-3 text-xs font-medium text-muted hover:bg-ths-soft"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </Field>
  );
}
