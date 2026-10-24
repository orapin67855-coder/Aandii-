import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ProgressChart } from "@/features/progress/ProgressChart";
import { currentUser } from "@/lib/auth/http";

export default async function ProgressPage() {
  const user = await currentUser();
  return (
    <div className="grid gap-5">
      <PageHeader title="พัฒนาการ" subtitle="เลือกดูเวลาอ่านเป็นสัปดาห์ เดือน หรือปี ตามเวลาไทย" />
      {user ? (
        <Card>
          <ProgressChart />
        </Card>
      ) : (
        <Card>
          <p className="text-ink-soft">เข้าสู่ระบบก่อน แล้วเวลาที่จบรอบโฟกัสจะมาอยู่ตรงนี้</p>
          <Link href="/login" className="mt-3 inline-flex min-h-12 items-center rounded-2xl bg-sun-400 px-5 font-semibold text-ink">เข้าสู่ระบบ</Link>
        </Card>
      )}
    </div>
  );
}
