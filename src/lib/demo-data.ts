// ALL DATA IN THIS FILE IS MOCK. Pages using it must render <DemoBadge />.
// Replace with Supabase queries in Stage 4–5 (see docs/CURSOR_STAGES.md).
export const demoSubjects = [
  { id: "math", name: "คณิตศาสตร์", color: "#5B7BC4", minutes: 140 },
  { id: "sci", name: "วิทยาศาสตร์", color: "#8FD5B3", minutes: 95 },
  { id: "eng", name: "ภาษาอังกฤษ", color: "#F6C945", minutes: 60 },
  { id: "thai", name: "ภาษาไทย", color: "#9DB4E6", minutes: 35 },
];
export const demoTasks = [
  { id: "t1", title: "ทบทวนเรื่องสมการกำลังสอง", subject: "คณิตศาสตร์", due: "พรุ่งนี้", status: "doing" },
  { id: "t2", title: "สรุปบทแรงและการเคลื่อนที่", subject: "วิทยาศาสตร์", due: "ศุกร์นี้", status: "todo" },
  { id: "t3", title: "ท่องศัพท์ Unit 5", subject: "ภาษาอังกฤษ", due: "เสาร์นี้", status: "todo" },
  { id: "t4", title: "อ่านบทที่ 3 วรรณคดี", subject: "ภาษาไทย", due: "เมื่อวาน", status: "done" },
];
export const demoExams = [
  { id: "e1", title: "สอบกลางภาค — คณิตศาสตร์", date: "2026-11-09" },
  { id: "e2", title: "สอบกลางภาค — วิทยาศาสตร์", date: "2026-11-11" },
];
export const demoWeekMinutes = [45, 80, 30, 120, 60, 90, 40];
export const demoStars = 18;
export const demoPeers = [
  { id: "p1", name: "มะปราง", state: "focus" as const },
  { id: "p2", name: "ต้นกล้า", state: "rest" as const },
  { id: "p3", name: "พลอย", state: "focus" as const },
];
