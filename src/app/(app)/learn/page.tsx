import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { QuestionCard } from "@/features/questions/QuestionCard";
import { SAMPLE_QUESTIONS } from "@/lib/questions";
import { SOURCES } from "@/lib/sources";

export default function LearnPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="ข้อสอบ" subtitle="ข้อที่ยังรอคนตรวจ ให้น้องไข่ช่วยคิดได้ แต่เฉลยทางการยังไม่เปิด" />
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">อยากรู้ระดับของตัวเองก่อนอ่าน ทำแบบวัดสั้นที่เขียนเองสำหรับ Aandii ได้</p>
        <Link href="/placement" className="inline-flex min-h-12 items-center rounded-2xl bg-sun-400 px-5 font-semibold text-ink">ไปแบบวัดระดับ</Link>
      </Card>
      <section className="grid gap-4">
        <h2 className="font-semibold">ข้อสอบตัวอย่าง (เขียนเองสำหรับ Aandii · รอตรวจ)</h2>
        {SAMPLE_QUESTIONS.map((q) => <QuestionCard key={q.id} q={q} />)}
      </section>
      <section className="grid gap-3">
        <h2 className="font-semibold">แหล่งข้อสอบและสื่อ</h2>
        <p className="rounded-2xl bg-sun-100 p-4 text-sm">ลิงก์เหล่านี้เป็นจุดเริ่มต้นสำหรับค้นหาและตรวจสอบ ไม่ได้หมายความว่านำเนื้อหาไปเผยแพร่ซ้ำในแอปได้ ต้องตรวจเงื่อนไขสิทธิ์ของแต่ละแหล่งก่อน</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="block min-h-16 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-brand-100 transition hover:-translate-y-0.5">
                <div className="font-semibold text-brand-700">{s.name} ↗</div><div className="text-sm text-ink-soft">{s.desc}</div>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
