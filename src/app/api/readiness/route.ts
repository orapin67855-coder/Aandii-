import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/auth/http";
import { ReadinessInput } from "@/lib/readiness/score";
import { saveReadiness, todayPlan } from "@/lib/readiness/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  return NextResponse.json({ plan: await todayPlan(user.id) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const parsed = ReadinessInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "กรอกชั่วโมงนอน 0–14 และคะแนน 1–5 ให้ครบ" }, { status: 400 });
  return NextResponse.json({ plan: await saveReadiness(user.id, parsed.data) });
}
