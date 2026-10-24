import { Mascot } from "./Mascot";
import { react, type MascotEvent } from "@/lib/mascot-messages";

/** น้องไข่พร้อมบับเบิลคำพูดตามเหตุการณ์ (แบบนกฮูก Duolingo) */
export function MascotBubble({ event, seed = 0, size = 130 }: { event: MascotEvent; seed?: number; size?: number }) {
  const r = react(event, seed);
  return (
    <div className="flex items-end gap-3">
      <Mascot state={r.mood} size={size} />
      <p role="status" aria-live="polite" className="max-w-xs rounded-3xl rounded-bl-md bg-white p-4 text-sm font-semibold text-brand-700 shadow-soft ring-1 ring-brand-100">
        {r.line}
      </p>
    </div>
  );
}
