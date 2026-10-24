import { z } from "zod";

export const ReadinessInput = z.object({
  sleepHours: z.number().min(0).max(14),
  sleepQuality: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  mood: z.number().int().min(1).max(5),
  stress: z.number().int().min(1).max(5),
});
export type ReadinessInput = z.infer<typeof ReadinessInput>;

export type ReadinessLevel = "high" | "medium" | "low";
export interface ReadinessResult {
  score: number; // 0-100
  level: ReadinessLevel;
  plan: { focusMinutes: number; breakMinutes: number; maxBlocks: number; message: string };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Simple, explainable rule-based score. NOT a medical assessment.
 * Weights: sleep hours 40, sleep quality 15, energy 20, mood 10, low stress 15.
 */
export function computeReadiness(raw: ReadinessInput): ReadinessResult {
  const i = ReadinessInput.parse(raw);
  const sleepHoursScore = clamp((i.sleepHours - 4) / 4, 0, 1) * 40; // 8h+ = full
  const score = Math.round(
    sleepHoursScore +
      ((i.sleepQuality - 1) / 4) * 15 +
      ((i.energy - 1) / 4) * 20 +
      ((i.mood - 1) / 4) * 10 +
      ((5 - i.stress) / 4) * 15
  );
  const level: ReadinessLevel = score >= 70 ? "high" : score >= 45 ? "medium" : "low";

  const plans: Record<ReadinessLevel, ReadinessResult["plan"]> = {
    high: { focusMinutes: 50, breakMinutes: 10, maxBlocks: 4,
      message: "วันนี้พร้อมลุยเลย! ลองอ่านเรื่องที่ยากที่สุดก่อน แล้วอย่าลืมพักสั้นๆ ระหว่างรอบนะ" },
    medium: { focusMinutes: 25, breakMinutes: 5, maxBlocks: 3,
      message: "วันนี้อ่านแบบพอดีๆ ก็เก่งแล้ว เริ่มจากวิชาที่สอบใกล้สุด 25 นาทีแล้วพักนะ" },
    low: { focusMinutes: 15, breakMinutes: 10, maxBlocks: 2,
      message: "วันนี้ร่างกายอาจต้องการพัก ทบทวนเบาๆ สั้นๆ หรือพักผ่อนก็ไม่เป็นไรเลยนะ น้องไข่รออยู่เสมอ" },
  };
  return { score, level, plan: plans[level] };
}

/** แผนอ่าน/พักรายวัน จากคะแนนความพร้อม + ชั่วโมงนอน (กฎง่ายๆ ที่อธิบายได้ ไม่ใช่คำแนะนำทางการแพทย์) */
export interface DailyPlan {
  totalStudyMinutes: number;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  blocks: number;
  totalBreakMinutes: number;
  note: string;
}

export function buildDailyPlan(result: ReadinessResult, sleepHours: number): DailyPlan {
  const base = { high: 240, medium: 150, low: 60 }[result.level];
  const sleepFactor = sleepHours < 6 ? 0.7 : sleepHours < 7 ? 0.85 : 1;
  const total = Math.max(15, Math.round((base * sleepFactor) / 5) * 5);
  const focus = result.plan.focusMinutes;
  const short = result.plan.breakMinutes;
  const long = 25;
  const blocks = Math.max(1, Math.ceil(total / focus));
  const totalBreak = (blocks - 1) * short + (blocks >= 4 ? long - short : 0);
  const note = sleepHours < 6
    ? "นอนไม่ถึง 6 ชั่วโมง วันนี้ลดเวลาอ่านและเน้นทบทวนเบาๆ คืนนี้ลองเข้านอนเร็วขึ้นนะ"
    : result.level === "low"
      ? "วันนี้พลังงานน้อย อ่านสั้นๆ แล้วพักเยอะๆ ก็เก่งแล้ว"
      : "วางแผนอ่านตามรอบ แล้วพักตามเวลาได้เลย";
  return { totalStudyMinutes: total, focusMinutes: focus, shortBreakMinutes: short, longBreakMinutes: long, blocks, totalBreakMinutes: totalBreak, note };
}
