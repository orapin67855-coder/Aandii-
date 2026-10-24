export function SleepZs({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`pointer-events-none absolute right-0 top-0 text-brand-300 ${className}`}>
      <span className="block animate-zz text-lg font-bold leading-none">z</span>
      <span className="block animate-zz text-sm font-bold leading-none [animation-delay:700ms]">z</span>
    </span>
  );
}
