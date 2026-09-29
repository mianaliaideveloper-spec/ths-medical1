"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { fieldClass } from "@/components/shell";
import {
  filterGenericSuggestions,
  filterMedicineSuggestions,
  type MedicineSuggestion,
} from "@/lib/medicine-suggestions";
import type { Medicine } from "@/lib/types";

type BaseProps = {
  label: string;
  placeholder?: string;
  medicines: Medicine[];
  value: string;
  onChange: (value: string) => void;
  onSelectMedicine?: (item: MedicineSuggestion) => void;
  required?: boolean;
  /** Show “Add medicine” in the dropdown while typing (uses current text as prefilled name). */
  showAddNew?: boolean;
};

export function MedicineNameAutocomplete({
  label,
  placeholder = "Type medicine name…",
  medicines,
  value,
  onChange,
  onSelectMedicine,
  required = false,
  showAddNew = false,
}: BaseProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const suggestions = filterMedicineSuggestions(value, medicines);
  const typed = value.trim();
  const exactInStock = typed
    ? medicines.some((item) => item.name.toLowerCase() === typed.toLowerCase())
    : false;
  const addHref = typed ? `/medicines/new?name=${encodeURIComponent(typed)}` : "/medicines/new";
  const showDropdown = open && (suggestions.length > 0 || (showAddNew && typed.length > 0));

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <label className="relative block text-sm">
      <span className="mb-1.5 block font-medium text-ths-dark">{label}</span>
      <div ref={rootRef}>
        <input
          className={fieldClass}
          value={value}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          required={required}
        />
        {showDropdown && (
          <ul
            id={listId}
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg"
          >
            {suggestions.map((item) => (
              <li key={item.name}>
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-clinic-soft"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(item.name);
                    onSelectMedicine?.(item);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-ths-dark">
                    {item.name}
                    {item.medicineId ? (
                      <span className="ml-2 text-xs font-normal text-ths">In stock</span>
                    ) : (
                      <span className="ml-2 text-xs font-normal text-muted">Name hint only</span>
                    )}
                  </span>
                  <span className="text-xs text-muted">
                    {item.itemType || "Medicine"}
                    {item.strength ? ` · ${item.strength}` : ""}
                  </span>
                </button>
              </li>
            ))}
            {showAddNew && typed.length > 0 && (
              <li className="border-t border-line p-2">
                <Link
                  href={addHref}
                  className="flex w-full flex-col rounded-lg bg-ths px-3 py-2.5 text-left text-white hover:bg-ths-dark"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setOpen(false)}
                >
                  <span className="font-semibold">
                    {exactInStock ? "Add another batch" : "Add medicine"}
                  </span>
                  <span className="text-xs text-white/85">
                    {exactInStock ? `New stock entry for “${typed}”` : `Create “${typed}” in inventory`}
                  </span>
                </Link>
              </li>
            )}
          </ul>
        )}
      </div>
    </label>
  );
}

export function GenericNameAutocomplete({
  label,
  placeholder = "Type generic name…",
  medicines,
  value,
  onChange,
  required = false,
}: Omit<BaseProps, "onSelectMedicine">) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const suggestions = filterGenericSuggestions(value, medicines);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <label className="relative block text-sm">
      <span className="mb-1.5 block font-medium text-ths-dark">{label}</span>
      <div ref={rootRef}>
        <input
          className={fieldClass}
          value={value}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          required={required}
        />
        {open && suggestions.length > 0 && (
          <ul
            id={listId}
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg"
          >
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-clinic-soft"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </label>
  );
}
