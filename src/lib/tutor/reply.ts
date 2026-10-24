export type TutorQuestion = { review: "pending" | "verified"; prompt: string; explanation: string; options: string[]; answer: number };
export type TutorAnswer = { text: string; steps: string[] };

const WAITING = "โจทย์นี้ยังรอคนตรวจคำตอบ ติวเตอร์จะยังไม่อธิบายเป็นคำตอบที่ใช้ได้ และจะไม่เดาเอง";

export const PHOTO_NOTE = "ได้รับรูปโจทย์แล้ว รูปถูกเก็บในบัญชีนี้ แต่ยังไม่มีเฉลยที่ตรวจแล้วของรูปนี้ จึงจะไม่อธิบายเป็นคำตอบที่ใช้ได้ และจะไม่เดาเอง";

export function tutorReply(question: TutorQuestion | undefined): TutorAnswer {
  if (!question || question.review !== "verified") return { text: WAITING, steps: [] };
  const choice = question.options[question.answer] ?? "";
  return { text: `คำตอบที่ตรวจแล้วคือ ${choice}`, steps: [question.prompt, question.explanation] };
}
