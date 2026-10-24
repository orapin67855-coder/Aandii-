import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { PlacementSummary } from "@/features/placement/PlacementSummary";
import { currentUser } from "@/lib/auth/http";
import { latestPlacement } from "@/lib/placement/store";

export default async function PlannerPage() {
  const user = await currentUser();
  const placement = user ? await latestPlacement(user.id) : null;
  return (
    <div className="grid gap-5">
      <PageHeader title="แผน" subtitle="ระดับจากแบบวัดช่วยบอกว่าควรเริ่มอ่านจากจุดไหน" />
      <PlacementSummary result={placement} />
      <Card>
        <p className="text-ink-soft">เริ่มอ่านได้จากโหมดโฟกัสหรือห้องอ่าน เวลาที่จบรอบจะถูกบันทึกในบัญชี</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/focus" className="inline-flex min-h-12 items-center rounded-2xl bg-sun-400 px-5 font-semibold text-ink">ไปโหมดโฟกัส</Link>
          <Link href="/buddy" className="inline-flex min-h-12 items-center rounded-2xl bg-white px-5 font-semibold text-brand-700 ring-1 ring-brand-100">ไปห้องอ่าน</Link>
        </div>
      </Card>
    </div>
  );
}
