/** Every mock-data area must show this. Remove when wired to real data. */
export function DemoBadge({ text = "ข้อมูลสาธิต" }: { text?: string }) {
  return <span className="inline-flex items-center rounded-full bg-sun-100 px-3 py-1 text-xs font-semibold text-sun-600">{text}</span>;
}
