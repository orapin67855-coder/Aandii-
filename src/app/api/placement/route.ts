import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth/http";
import { scorePlacement } from "@/lib/placement/bank";
import { latestPlacement, storePlacement, type SavedPlacement } from "@/lib/placement/store";
import { allowRate } from "@/lib/rate";

export const dynamic = "force-dynamic";

const Body = z.object({
  answers: z.array(z.object({ id: z.string(), choice: z.number().int() })).max(20),
});

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  return NextResponse.json({ result: await latestPlacement(user.id) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน ผลจะได้ถูกเก็บในบัญชี" }, { status: 401 });
  if (!(await allowRate(user.id, "placement", 8, 60_000))) {
    return NextResponse.json({ error: "ส่งถี่ไปนิดนะ รอสักครู่แล้วลองใหม่" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "คำตอบไม่ถูกต้อง" }, { status: 400 });
  const scored = scorePlacement(parsed.data.answers);
  if (!scored.ok) return NextResponse.json({ error: scored.message }, { status: 400 });
  const saved: SavedPlacement = {
    userId: user.id,
    takenAt: new Date().toISOString(),
    correct: scored.score.correct,
    total: scored.score.total,
    level: scored.score.level,
    note: scored.score.note,
    bySubject: scored.score.bySubject,
  };
  await storePlacement(saved);
  return NextResponse.json({ result: saved, items: scored.score.items });
}
