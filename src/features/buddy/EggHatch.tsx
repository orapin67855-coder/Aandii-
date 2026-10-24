import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

const STAGES = [
  { min: 0, emoji: "🥚", name: "ไข่ใบน้อย" },
  { min: 15, emoji: "🥚", name: "ไข่เริ่มร้าว" },
  { min: 40, emoji: "🐣", name: "ฟักออกมาแล้ว" },
  { min: 80, emoji: "🐥", name: "น้องไข่ตัวโต" },
];

/** ดาวมาจากการอ่านและการพัก (ไม่หักดาวเมื่อพัก) — ค่าจริงต้องมาจากตาราง reward_ledger */
export function EggHatch({ stars }: { stars: number }) {
  let i = 0;
  STAGES.forEach((s, idx) => { if (stars >= s.min) i = idx; });
  const cur = STAGES[i], next = STAGES[i + 1];
  return (
    <Card className="grid gap-3 text-center">
      <div className="text-6xl" aria-hidden>{cur.emoji}</div>
      <h2 className="font-semibold">{cur.name}</h2>
      {next ? (
        <>
          <ProgressBar value={stars - cur.min} max={next.min - cur.min} label="ความคืบหน้าการฟักไข่" />
          <p className="text-sm text-ink-soft">อีก {next.min - stars} ดาว จะเป็น “{next.name}”</p>
        </>
      ) : <p className="text-sm text-ink-soft">เติบโตเต็มที่แล้ว เก่งมาก!</p>}
    </Card>
  );
}
