import Link from "next/link";
import Clock from "@/components/Clock";
import { MascotBubble } from "@/components/mascot/MascotBubble";
import { Card } from "@/components/ui/Card";
import { WeekBars } from "@/components/ui/WeekBars";
import { PlacementSummary } from "@/features/placement/PlacementSummary";
import { currentUser } from "@/lib/auth/http";
import { latestPlacement } from "@/lib/placement/store";
import { bangkokParts, minutesFromSeconds } from "@/lib/study/stats";
import { weekFocusSeconds } from "@/lib/study/store";

export default async function HomePage() {
  const user = await currentUser();
  const seconds = user ? await weekFocusSeconds(user.id) : [0, 0, 0, 0, 0, 0, 0];
  const todayMinutes = minutesFromSeconds(seconds[bangkokParts(new Date()).weekday] ?? 0);
  const placement = user ? await latestPlacement(user.id) : null;
  return (
    <div className="grid gap-5">
      <Card className="grid items-center gap-4 bg-gradient-to-br from-brand-50 to-white md:grid-cols-[1fr_auto]">
        <div>
          <p className="mb-2 font-medium">{user ? `สวัสดี ${user.username}` : "สวัสดี"} วันนี้อ่านดิ</p>
          <Clock />
        </div>
        <MascotBubble event="greet" />
      </Card>
      <PlacementSummary result={placement} />
      {user ? (
        <Card>
          <p className="text-sm text-ink-soft">เวลาโฟกัสที่บันทึกในบัญชีวันนี้</p>
          <p className="text-3xl font-bold text-brand-700">{todayMinutes > 0 ? `${todayMinutes} นาที` : "ยังไม่มีในวันนี้"}</p>
        </Card>
      ) : (
        <Card>
          <p className="font-semibold">เข้าสู่ระบบเพื่อเก็บเวลาอ่านและผลวัดระดับไว้ในบัญชี</p>
          <span className="mt-3 flex flex-wrap gap-2">
            <Link href="/login" className="inline-flex min-h-12 items-center rounded-2xl bg-sun-400 px-5 font-semibold text-ink">เข้าสู่ระบบ</Link>
            <Link href="/signup" className="inline-flex min-h-12 items-center rounded-2xl bg-white px-5 font-semibold text-brand-700 ring-1 ring-brand-100">สมัครบัญชี</Link>
          </span>
        </Card>
      )}
      {user && (
        <Card>
          <h2 className="mb-3 font-semibold">สัปดาห์นี้</h2>
          <WeekBars minutes={seconds.map(minutesFromSeconds)} />
        </Card>
      )}
      <div className="flex flex-wrap gap-3">
        <Link href="/buddy" className="inline-flex min-h-12 items-center rounded-2xl bg-brand-600 px-6 font-semibold text-white shadow-soft">เข้าห้องอ่าน</Link>
        <Link href="/focus" className="inline-flex min-h-12 items-center rounded-2xl bg-white px-6 font-semibold text-brand-700 shadow-soft ring-1 ring-brand-100">เริ่มโหมดโฟกัส</Link>
        <Link href="/tutor" className="inline-flex min-h-12 items-center rounded-2xl bg-sun-100 px-6 font-semibold text-ink">ถามติวเตอร์</Link>
      </div>
    </div>
  );
}
