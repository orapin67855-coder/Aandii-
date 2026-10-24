import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { PlacementSummary } from "@/features/placement/PlacementSummary";
import { PlacementTest } from "@/features/placement/PlacementTest";
import { currentUser } from "@/lib/auth/http";
import { publicPlacementQuestions } from "@/lib/placement/bank";
import { latestPlacement } from "@/lib/placement/store";

export default async function PlacementPage() {
  const user = await currentUser();
  const result = user ? await latestPlacement(user.id) : null;
  return (
    <div className="grid gap-5">
      <PageHeader title="แบบวัดระดับ" subtitle="ข้อสอบสั้นก่อนเริ่มอ่าน เพื่อดูว่าอยู่ระดับไหนของชุดนี้" />
      {result && <PlacementSummary result={result} />}
      {user ? (
        <PlacementTest questions={publicPlacementQuestions()} />
      ) : (
        <Card className="grid gap-3">
          <p className="font-semibold">เข้าสู่ระบบก่อน ผลวัดระดับจะได้ถูกเก็บในบัญชี</p>
          <span className="flex flex-wrap gap-2">
            <Link href="/login" className="inline-flex min-h-12 items-center rounded-2xl bg-sun-400 px-5 font-semibold text-ink">เข้าสู่ระบบ</Link>
            <Link href="/signup" className="inline-flex min-h-12 items-center rounded-2xl bg-white px-5 font-semibold text-brand-700 ring-1 ring-brand-100">สมัครบัญชี</Link>
          </span>
        </Card>
      )}
    </div>
  );
}
