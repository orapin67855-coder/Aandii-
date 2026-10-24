import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, sameOrigin } from "@/lib/auth/http";
import { allowRate } from "@/lib/rate";
import { tutorAnswer } from "@/lib/tutor/model";
import { SAMPLE_QUESTIONS } from "@/lib/questions";
import {
  askBank,
  cachedTutorAnswer,
  latestTutorThread,
  logTutorUsage,
  questionHash,
  questionsToday,
  questionsTodayAll,
  recentTurns,
  rememberTutorAnswer,
  saveTutorExchange,
} from "@/lib/tutor/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const USER_LIMIT = Number(process.env.TUTOR_DAILY_LIMIT ?? 40);
const GLOBAL_LIMIT = Number(process.env.AI_GLOBAL_DAILY_LIMIT ?? 200);
const IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const Body = z.object({
  text: z.string().trim().max(2000).default(""),
  message: z.string().trim().max(2000).optional(),
  questionId: z.string().nullable().optional(),
  subject: z.string().trim().max(40).optional(),
  threadId: z.string().uuid().optional(),
  images: z.array(z.string().max(2_000_000).regex(IMG)).max(3).default([]),
}).refine((body) => (body.text || body.message || "").length > 0 || body.images.length > 0, "ต้องมีข้อความหรือรูป");

function fail(error: string, status: number, requestId: string) {
  return NextResponse.json({ error, requestId }, { status, headers: { "X-Request-Id": requestId } });
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "เข้าสู่ระบบก่อน" }, { status: 401 });
  return NextResponse.json(await latestTutorThread(user.id));
}

export async function POST(req: Request) {
  const started = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  if (!sameOrigin(req)) return fail("คำขอไม่ถูกต้อง", 403, requestId);
  const user = await currentUser();
  if (!user) return fail("เข้าสู่ระบบก่อน", 401, requestId);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("ข้อความหรือรูปไม่ถูกต้อง (ข้อความไม่เกิน 2,000 ตัวอักษร, รูปไม่เกิน 3 รูป)", 400, requestId);
  const text = parsed.data.text || parsed.data.message || "";
  const bank = parsed.data.questionId ? SAMPLE_QUESTIONS.find((item) => item.id === parsed.data.questionId) : undefined;
  const askText = bank && bank.review !== "verified"
    ? `ช่วยอธิบายโจทย์นี้ทีละขั้น โดยยังไม่มีเฉลยที่คนตรวจแล้ว\n${bank.prompt}\nตัวเลือก: ${bank.options.join(" / ")}`
    : text;
  const log = (status: string, httpStatus: number, extra: { model?: string; prompt?: number; completion?: number } = {}) => logTutorUsage({
    userId: user.id,
    requestId,
    status,
    model: extra.model,
    latencyMs: Date.now() - started,
    promptTokens: extra.prompt ?? 0,
    completionTokens: extra.completion ?? 0,
    httpStatus,
  });

  if (parsed.data.questionId && bank?.review === "verified") {
    if (!text) return fail("พิมพ์คำถามก่อน", 400, requestId);
    const saved = await askBank(user.id, text, parsed.data.questionId, parsed.data.threadId);
    if (!saved) return fail("ไม่พบบทสนทนา", 404, requestId);
    return NextResponse.json({ message: saved.message, threadId: saved.conversationId, requestId });
  }
  if (!(await allowRate(user.id, "tutor", 6, 60_000))) {
    await log("rate_limited", 429);
    return fail("ถามเร็วไปนิดนะ รอสักครู่แล้วลองใหม่", 429, requestId);
  }
  if ((await questionsToday(user.id)) >= USER_LIMIT) {
    await log("rate_limited", 429);
    return fail(`วันนี้ถามครบ ${USER_LIMIT} ครั้งแล้ว พรุ่งนี้มาถามใหม่ได้`, 429, requestId);
  }
  if ((await questionsTodayAll()) >= GLOBAL_LIMIT) {
    await log("rate_limited", 429);
    return fail("วันนี้มีคนถามน้องไข่เยอะมาก พรุ่งนี้มาลองใหม่นะ", 429, requestId);
  }
  const history = parsed.data.threadId ? await recentTurns(user.id, parsed.data.threadId) : [];
  const hash = questionHash(parsed.data.subject ?? "", text);
  if (history.length === 0 && parsed.data.images.length === 0) {
    const cached = await cachedTutorAnswer(hash);
    if (cached) {
      const saved = await saveTutorExchange(user.id, text, cached.answer, true, parsed.data.threadId);
      if (!saved) return fail("ไม่พบบทสนทนา", 404, requestId);
      await log("cache_hit", 200);
      return NextResponse.json({ message: saved.message, threadId: saved.conversationId, usedCalculator: true, requestId });
    }
  }
  const note = parsed.data.images.length ? ` [แนบรูป ${parsed.data.images.length} รูป]` : "";
  const storedText = `${text || "(ส่งรูปโจทย์)"}${note}`;
  const result = await tutorAnswer({
    history,
    message: askText,
    subject: parsed.data.subject,
    images: parsed.data.images,
  });
  if (!result.ok) {
    await log("provider_error", result.status);
    return fail(result.error, result.status, requestId);
  }
  const saved = await saveTutorExchange(user.id, storedText, result.answer, result.usedCalculator, parsed.data.threadId);
  if (!saved) return fail("ไม่พบบทสนทนา", 404, requestId);
  if (history.length === 0 && parsed.data.images.length === 0 && result.trace.length > 0 && result.trace.every((item) => item.ok)) {
    await rememberTutorAnswer(hash, result.answer, result.trace);
  }
  await log("ok", 200, { model: result.usage.model, prompt: result.usage.prompt, completion: result.usage.completion });
  return NextResponse.json({
    message: saved.message,
    threadId: saved.conversationId,
    usedCalculator: result.usedCalculator,
    requestId,
  }, { headers: { "X-Request-Id": requestId } });
}
