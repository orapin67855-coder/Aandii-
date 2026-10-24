// Original sample questions written for Aandii (not copied from any source). Still "pending review" until a human checks them.
export interface Question { id: string; subject: string; topic: string; difficulty: "ง่าย" | "กลาง" | "ยาก"; prompt: string; options: string[]; answer: number; explanation: string; review: "pending" | "verified" }

export const SAMPLE_QUESTIONS: Question[] = [
  { id: "q1", subject: "คณิตศาสตร์", topic: "สมการเชิงเส้น", difficulty: "ง่าย", prompt: "ถ้า 2x + 3 = 11 แล้ว x เท่ากับเท่าใด", options: ["3", "4", "5", "8"], answer: 1, explanation: "ย้าย 3 ไปอีกข้าง ได้ 2x = 8 แล้วหารด้วย 2 ได้ x = 4", review: "pending" },
  { id: "q2", subject: "วิทยาศาสตร์", topic: "สมบัติของสาร", difficulty: "ง่าย", prompt: "น้ำบริสุทธิ์เดือดที่กี่องศาเซลเซียส ที่ความดัน 1 บรรยากาศ", options: ["90", "100", "110", "120"], answer: 1, explanation: "จุดเดือดของน้ำบริสุทธิ์ที่ความดัน 1 บรรยากาศคือ 100 °C", review: "pending" },
  { id: "q3", subject: "ภาษาอังกฤษ", topic: "Subject–Verb Agreement", difficulty: "กลาง", prompt: "She ___ to school every day.", options: ["go", "goes", "going", "gone"], answer: 1, explanation: "ประธานเอกพจน์บุรุษที่ 3 (She) ใน Present Simple ใช้ verb เติม -es → goes", review: "pending" },
];
