import Link from "next/link";
import { Mascot } from "@/components/mascot/Mascot";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-content-center justify-items-center gap-3 bg-cream p-6 text-center">
      <Mascot state="curious" size={140} />
      <h1 className="text-xl font-bold text-brand-700">ไม่พบหน้านี้</h1>
      <p className="text-ink-soft">หน้านี้อาจถูกย้าย หรือลิงก์ไม่ตรง</p>
      <Link href="/home" className="inline-flex min-h-12 items-center rounded-2xl bg-sun-400 px-6 font-semibold text-ink">กลับหน้าแรก</Link>
    </main>
  );
}
