import clsx from "clsx";
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={clsx("rounded-3xl bg-white p-5 shadow-soft ring-1 ring-brand-100", className)}>{children}</section>;
}
