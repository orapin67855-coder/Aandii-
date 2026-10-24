import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/auth/http";
import { tutorAnswer } from "@/lib/tutor/model";
import { questionsToday, questionsTodayAll, recentTurns, saveTutorExchange } from "@/lib/tutor/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const USER_LIMIT = Number(process.env.TUTOR_DAILY_LIMIT ?? 40);
const GLOBAL_LIMIT = Number(process.env.AI_GLOBAL_DAILY_LIMIT ?? 200);
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  const note = form?.get("note");
  if (!(file instanceof File) || !TYPES.has(file.type) || file.size < 1 || file.size > 4_000_000) {
    return NextResponse.json({ error: "ใช้รูป jpg png หรือ webp ที่ไม่เกิน 4 MB" }, { status: 400 });
  }
  if ((await questionsToday(user.id)) >= USER_LIMIT) {
    return NextResponse.json({ error: `วันนี้ถามครบ ${USER_LIMIT} ครั้งแล้ว พรุ่งนี้มาถามใหม่ได้` }, { status: 429 });
  }
  if ((await questionsTodayAll()) >= GLOBAL_LIMIT) {
    return NextResponse.json({ error: "วันนี้มีคนถามน้องไข่เยอะมาก พรุ่งนี้มาลองใหม่นะ" }, { status: 429 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const image = `data:${file.type};base64,${bytes.toString("base64")}`;
  const caption = typeof note === "string" ? note.trim().slice(0, 2000) : "";
  const userText = `${caption || "(ส่งรูปโจทย์)"} [แนบรูป 1 รูป]`;
  const result = await tutorAnswer({
    history: await recentTurns(user.id),
    message: caption,
    images: [image],
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const message = await saveTutorExchange(user.id, userText, result.answer, result.usedCalculator);
  return NextResponse.json({ message, userText });
}
