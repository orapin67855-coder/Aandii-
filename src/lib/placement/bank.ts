export type PlacementLevel = "ต่ำกว่าเกณฑ์" | "ตามเกณฑ์" | "สูงกว่าเกณฑ์";

export type PublicQuestion = {
  id: string;
  subject: string;
  topic: string;
  prompt: string;
  options: string[];
};

type Item = PublicQuestion & { answer: number };

/** ข้อที่เขียนเองสำหรับวัดระดับคร่าวๆ ของ Aandii ไม่ได้คัดลอกจากข้อสอบที่เผยแพร่ */
const ITEMS: Item[] = [
  {
    id: "p-math-1",
    subject: "คณิตศาสตร์",
    topic: "สมการเชิงเส้น",
    prompt: "ถ้า 3x + 1 = 10 แล้ว x เท่ากับเท่าใด",
    options: ["2", "3", "4", "9"],
    answer: 1,
  },
  {
    id: "p-math-2",
    subject: "คณิตศาสตร์",
    topic: "พื้นที่สี่เหลี่ยม",
    prompt: "สี่เหลี่ยมผืนผ้ากว้าง 4 เซนติเมตร ยาว 6 เซนติเมตร มีพื้นที่เท่าใด",
    options: ["10 ตารางเซนติเมตร", "20 ตารางเซนติเมตร", "24 ตารางเซนติเมตร", "48 ตารางเซนติเมตร"],
    answer: 2,
  },
  {
    id: "p-sci-1",
    subject: "วิทยาศาสตร์",
    topic: "จุดเดือด",
    prompt: "น้ำบริสุทธิ์เดือดที่กี่องศาเซลเซียส ที่ความดัน 1 บรรยากาศ",
    options: ["0", "50", "100", "212"],
    answer: 2,
  },
  {
    id: "p-sci-2",
    subject: "วิทยาศาสตร์",
    topic: "เซลล์",
    prompt: "ส่วนที่ควบคุมการทำงานของเซลล์คืออะไร",
    options: ["ผนังเซลล์", "นิวเคลียส", "ไซโทพลาซึม", "เยื่อหุ้มเซลล์"],
    answer: 1,
  },
  {
    id: "p-en-1",
    subject: "ภาษาอังกฤษ",
    topic: "Present simple",
    prompt: "She ___ her homework every evening.",
    options: ["do", "does", "doing", "did"],
    answer: 1,
  },
  {
    id: "p-th-1",
    subject: "ภาษาไทย",
    topic: "ราชาศัพท์",
    prompt: "คำราชาศัพท์ของ “นอน” คือข้อใด",
    options: ["เสวย", "ตรัส", "บรรทม", "ทรงโปรด"],
    answer: 2,
  },
];

export type GradedItem = { id: string; subject: string; correct: boolean };

export type PlacementScore = {
  correct: number;
  total: number;
  level: PlacementLevel;
  note: string;
  items: GradedItem[];
  bySubject: { subject: string; correct: number; total: number }[];
};

export function publicPlacementQuestions(): PublicQuestion[] {
  return ITEMS.map(({ id, subject, topic, prompt, options }) => ({ id, subject, topic, prompt, options }));
}

export function placementLevel(correct: number, total: number): PlacementLevel {
  if (total <= 0 || correct * 2 < total) return "ต่ำกว่าเกณฑ์";
  if (correct * 5 < total * 4) return "ตามเกณฑ์";
  return "สูงกว่าเกณฑ์";
}

const NOTES: Record<PlacementLevel, string> = {
  "ต่ำกว่าเกณฑ์": "ชุดนี้ยังไม่ถึงครึ่ง เริ่มอ่านจากเรื่องพื้นฐานของวิชาที่พลาดก่อนได้",
  "ตามเกณฑ์": "อยู่ในช่วงกลางของชุดนี้ อ่านต่อได้ และกลับไปทบทวนข้อที่พลาด",
  "สูงกว่าเกณฑ์": "ชุดนี้ทำได้ดี อ่านเรื่องที่ลึกขึ้นของวิชาที่ได้ครบได้",
};

/** ให้คะแนนบนเซิร์ฟเวอร์เท่านั้น ไม่ส่งเลขข้อที่ถูกกลับไป */
export function scorePlacement(picks: { id: string; choice: number }[]): { ok: true; score: PlacementScore } | { ok: false; message: string } {
  if (picks.length !== ITEMS.length) return { ok: false, message: "ตอบให้ครบทุกข้อ" };
  const seen = new Set<string>();
  const items: GradedItem[] = [];
  for (const item of ITEMS) {
    const pick = picks.find((entry) => entry.id === item.id);
    if (!pick || seen.has(item.id) || !Number.isInteger(pick.choice) || pick.choice < 0 || pick.choice >= item.options.length) {
      return { ok: false, message: "มีข้อที่ตอบไม่ครบ" };
    }
    seen.add(item.id);
    items.push({ id: item.id, subject: item.subject, correct: pick.choice === item.answer });
  }
  const subjects = new Map<string, { correct: number; total: number }>();
  for (const item of items) {
    const row = subjects.get(item.subject) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (item.correct) row.correct += 1;
    subjects.set(item.subject, row);
  }
  const correct = items.filter((item) => item.correct).length;
  const level = placementLevel(correct, items.length);
  return {
    ok: true,
    score: {
      correct,
      total: items.length,
      level,
      note: NOTES[level],
      items,
      bySubject: [...subjects.entries()].map(([subject, row]) => ({ subject, ...row })),
    },
  };
}
