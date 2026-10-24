import clsx from "clsx";
import { SleepZs } from "@/components/mascot/SleepZs";
import { Mascot } from "@/components/mascot/Mascot";
import { formatClock, subjectName, type NamedSubject } from "@/lib/rooms/rules";

export function Desk({ name, seconds, subjectId, reading, subjects }: { name: string; seconds: number; subjectId: string | null; reading: boolean; subjects?: NamedSubject[] }) {
  const face = reading ? "cheer" : seconds >= 3600 ? "yay" : "sleepy";
  return (
    <figure className={clsx("flex min-h-36 flex-col items-center justify-end gap-1 rounded-3xl px-2 py-3 text-center transition", reading ? "bg-sun-100 ring-2 ring-sun-400" : "bg-brand-50")}>
      <div className="relative">
        <Mascot state={face} size={72} bob={face !== "sleepy"} />
        {face === "sleepy" && <SleepZs />}
      </div>
      <figcaption className="max-w-full truncate text-sm font-semibold text-ink">{name}</figcaption>
      <p className="text-xs tabular-nums text-ink-soft">{reading ? subjectName(subjectId, subjects) : face === "yay" ? "อ่านครบชั่วโมง" : "หลับพัก"}</p>
      <p className="text-sm font-bold tabular-nums text-brand-700">{formatClock(seconds)}</p>
    </figure>
  );
}
