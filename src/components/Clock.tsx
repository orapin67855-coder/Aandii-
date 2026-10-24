"use client";
import { useEffect, useState } from "react";

/** นาฬิกาเรียลไทม์ แสดงวันที่และโซนเวลาของอุปกรณ์ (เริ่มว่างเพื่อไม่ให้ SSR/Client ไม่ตรงกัน) */
export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <div className="h-20" aria-hidden />;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div>
      <div className="text-5xl font-bold tabular-nums text-brand-700">{now.toLocaleTimeString("th-TH", { hour12: false })}</div>
      <div className="mt-1 text-sm text-ink-soft">
        {now.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {tz}
      </div>
    </div>
  );
}
