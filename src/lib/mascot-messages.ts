/** อารมณ์ของน้องไข่ = ชื่อไฟล์ใน public/mascot/<mood>.png */
export type MascotMood = "cheer" | "reading" | "yay" | "sleepy" | "curious" | "thanks" | "note" | "idea" | "boba" | "rest";

export type MascotEvent =
  | "greet" | "session_start" | "session_pause" | "session_done" | "long_session"
  | "quiz_correct" | "quiz_wrong" | "streak" | "low_readiness" | "high_readiness"
  | "flashcard_done" | "night" | "egg_hatch" | "note_saved" | "empty";

/** ข้อความต้องไม่ทำให้รู้สึกผิดเวลาพักหรือหยุดอ่าน */
const REACTIONS: Record<MascotEvent, { mood: MascotMood; lines: string[] }> = {
  greet: { mood: "cheer", lines: ["วันนี้อ่านดิ! น้องไข่เอาใจช่วยนะ 💙", "มาแล้วเหรอ~ เริ่มทีละนิดก็พอเลย", "พร้อมลุยกันมั้ย สู้ๆ!"] },
  session_start: { mood: "reading", lines: ["โหมดโฟกัส ON! น้องไข่นั่งอ่านเป็นเพื่อน", "ตั้งใจอ่านนะ เดี๋ยวน้องไข่เฝ้าเวลาให้"] },
  session_pause: { mood: "boba", lines: ["พักก่อนแล้วค่อยลุยต่อ ไม่ต้องรีบนะ", "ดื่มน้ำสักอึกนะ 🧋"] },
  session_done: { mood: "yay", lines: ["เย้! จบรอบแล้ว เก่งมาก ⭐", "ภูมิใจจัง! รับดาวไปเลย"] },
  long_session: { mood: "rest", lines: ["อ่านมานานแล้วนะ ลองพัก 10 นาทีมั้ย", "ยืดเส้นยืดสายหน่อยนะ ตาจะได้ไม่ล้า"] },
  quiz_correct: { mood: "yay", lines: ["ถูกต้อง! เจ๋งไปเลย", "ใช่เลย! จำได้แม่นมาก"] },
  quiz_wrong: { mood: "curious", lines: ["หืม? ไม่เป็นไร ดูเฉลยด้วยกันนะ", "พลาดนิดเดียว ครั้งหน้าจำได้แน่"] },
  streak: { mood: "yay", lines: ["อ่านต่อเนื่องมาหลายวันแล้ว! ขาดบ้างก็ไม่เป็นไรเลยนะ"] },
  low_readiness: { mood: "sleepy", lines: ["วันนี้ดูเหนื่อยๆ ทบทวนเบาๆ หรือพักก็ได้นะ"] },
  high_readiness: { mood: "cheer", lines: ["วันนี้พร้อมสุดๆ! ลองเรื่องที่ยากก่อนเลย"] },
  flashcard_done: { mood: "thanks", lines: ["ทบทวนครบแล้ว ขอบคุณที่ตั้งใจนะ 💙"] },
  night: { mood: "sleepy", lines: ["ดึกแล้วนะ พักผ่อนบ้าง พรุ่งนี้อ่านต่อได้"] },
  egg_hatch: { mood: "yay", lines: ["ไข่ฟักแล้ว! ขอบคุณที่เติบโตไปด้วยกันนะ"] },
  note_saved: { mood: "note", lines: ["จดโน้ตเรียบร้อย~"] },
  empty: { mood: "idea", lines: ["เริ่มสร้างการ์ดใบแรกกันเลย!"] },
};

/** เลือกข้อความแบบกำหนดได้ (seed) เพื่อไม่ให้ SSR/Client ไม่ตรงกัน */
export function react(event: MascotEvent, seed = 0) {
  const r = REACTIONS[event];
  return { mood: r.mood, line: r.lines[Math.abs(seed) % r.lines.length] };
}
