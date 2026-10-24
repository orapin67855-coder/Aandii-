import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { SavedPlacement } from "@/lib/placement/store";

const btn = "inline-flex min-h-12 w-fit items-center rounded-2xl px-5 font-semibold";

export function PlacementSummary({ result }: { result: SavedPlacement | null }) {
  if (!result) {
    return (
      <Card className="grid gap-3 bg-gradient-to-br from-sun-100 to-white">
        <h2 className="text-lg font-bold">วัดระดับก่อนเริ่มอ่าน</h2>
        <p className="text-sm leading-6 text-ink-soft">ทำข้อสอบสั้นที่ Aandii เขียนเอง เพื่อดูว่าตอนนี้อยู่ต่ำกว่าเกณฑ์ ตามเกณฑ์ หรือสูงกว่าเกณฑ์ของชุดนี้ อ่านโดยไม่ทำแบบวัดก็ได้</p>
        <Link href="/placement" className={`${btn} bg-sun-400 text-ink`}>เริ่มแบบวัดระดับ</Link>
      </Card>
    );
  }
  return (
    <Card className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">ระดับจากแบบวัดล่าสุด</h2>
        <span className="text-sm font-semibold text-brand-700">{result.level}</span>
      </div>
      <p className="text-sm">ถูก {result.correct} จาก {result.total} ข้อ · {result.note}</p>
      <ul className="grid gap-1 text-sm text-ink-soft">
        {result.bySubject.map((row) => (
          <li key={row.subject}>{row.subject} {row.correct}/{row.total}</li>
        ))}
      </ul>
      <p className="text-xs text-ink-soft">เกณฑ์นี้คิดจากแบบวัดสั้นของ Aandii ไม่ใช่เกณฑ์ของโรงเรียนหรือกระทรวง</p>
      <Link href="/placement" className={`${btn} bg-white text-brand-700 ring-1 ring-brand-100`}>ทำแบบวัดอีกครั้ง</Link>
    </Card>
  );
}
