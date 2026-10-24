import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const styles: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
  secondary: "bg-brand-50 text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100 disabled:opacity-60",
  ghost: "text-brand-700 hover:bg-brand-50 disabled:opacity-60",
  danger: "bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60",
};

/** Min touch target 44x44 (Apple HIG); use 48 on primary actions via className="min-h-12". */
export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
    />
  );
}
