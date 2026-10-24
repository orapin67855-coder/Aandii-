import { aiConfigured, ProviderError, runTutor } from "@/lib/tutor/provider";
import { TUTOR_DISCLAIMER, TUTOR_SYSTEM } from "@/lib/tutor/prompt";

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type TutorUsage = { prompt: number; completion: number; model: string };

function withDisclaimer(answer: string): string {
  return answer.includes("AI อาจพลาด") ? answer : `${answer}\n\n${TUTOR_DISCLAIMER}`;
}

export async function tutorAnswer(input: {
  history: ChatTurn[];
  message: string;
  subject?: string;
  images?: string[];
}): Promise<{ ok: true; answer: string; usedCalculator: boolean; trace: { ok: boolean }[]; usage: TutorUsage } | { ok: false; error: string; status: number }> {
  if (!aiConfigured()) {
    return { ok: false, error: "ยังไม่ได้ตั้งค่า AI_API_KEY บนเซิร์ฟเวอร์", status: 503 };
  }
  try {
    const result = await runTutor(TUTOR_SYSTEM(input.subject), input.history, input.message, input.images ?? []);
    if (!result.answer) return { ok: false, error: "ตอบไม่ได้ในตอนนี้ ลองถามใหม่อีกครั้ง", status: 502 };
    return {
      ok: true,
      answer: withDisclaimer(result.answer).slice(0, 8000),
      usedCalculator: result.trace.length > 0,
      trace: result.trace,
      usage: { prompt: result.usage.prompt, completion: result.usage.completion, model: result.model },
    };
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 0;
    console.error("[tutor] provider status", status);
    if (status === 429) return { ok: false, error: "ตอนนี้มีคนถามเยอะ รอสักครู่แล้วลองใหม่นะ", status: 429 };
    if (status === 401 || status === 403) return { ok: false, error: "คีย์ AI บนเซิร์ฟเวอร์ใช้ไม่ได้ ต้องตั้งค่าใหม่", status: 502 };
    return { ok: false, error: "น้องไข่ติดขัดนิดหน่อย ลองใหม่อีกครั้งนะ", status: 502 };
  }
}
