"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const inputClass = "min-h-12 w-full rounded-2xl bg-brand-50 px-4 pr-14 text-base text-ink ring-1 ring-brand-100";

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  required = true,
  minLength,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <span className="relative block">
        <input
          className={inputClass}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
        />
        <button
          type="button"
          className="absolute inset-y-1 right-1 grid w-11 place-items-center rounded-xl text-brand-700"
          aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={22} /> : <Eye size={22} />}
        </button>
      </span>
    </label>
  );
}
