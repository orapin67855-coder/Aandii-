import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth/http";
import { allowRate } from "@/lib/rate";
import { todayPlan } from "@/lib/readiness/store";
import { addSubject, cancelFocus, completeFocus, focusState, listSubjects, pauseFocus, resumeFocus, startFocus } from "@/lib/study/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  action: z.enum(["start", "pause", "resume", "complete", "cancel", "addSubject"]),
  subjectId: z.string().optional(),
  name: z.string().optional(),
});

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const subjects = await listSubjects(user.id);
  const session = await focusState(user.id);
  const plan = await todayPlan(user.id);
  return NextResponse.json({ session, subjects, plan, serverNow: Date.now() });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  if (!(await allowRate(user.id, "focus", 60, 60_000))) {
    return NextResponse.json({ error: "กดเร็วไปนิดนะ รอสักครู่แล้วลองใหม่" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
  const { action } = parsed.data;
  if (action === "addSubject") {
    const added = await addSubject(user.id, parsed.data.name ?? "");
    if (!added.ok) return NextResponse.json({ error: added.message }, { status: 400 });
    return NextResponse.json({ subject: added.subject, subjects: await listSubjects(user.id), serverNow: Date.now() });
  }
  if (action === "cancel") {
    await cancelFocus(user.id);
    return NextResponse.json({ session: null, serverNow: Date.now() });
  }
  if (action === "start") {
    if (!parsed.data.subjectId) return NextResponse.json({ error: "เลือกวิชาก่อน" }, { status: 400 });
    const started = await startFocus(user.id, parsed.data.subjectId);
    if (!started.ok) return NextResponse.json({ error: started.message }, { status: 400 });
    return NextResponse.json({ session: started.session, serverNow: Date.now() });
  }
  const session = action === "pause" ? await pauseFocus(user.id)
    : action === "resume" ? await resumeFocus(user.id)
    : await completeFocus(user.id);
  return NextResponse.json({ session, serverNow: Date.now() });
}
