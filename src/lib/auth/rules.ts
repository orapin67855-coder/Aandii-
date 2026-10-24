export const EDUCATION_LEVELS = ["ม.4", "ม.5", "ม.6", "อื่นๆ"] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  educationLevel: EducationLevel;
  age: number;
};

export const PASSWORD_HINT = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์ใหญ่ (A-Z) ตัวพิมพ์เล็ก (a-z) และตัวเลข (0-9)";

export function passwordError(password: string): string | null {
  if (password.length < 8) return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  if (password.length > 72) return "รหัสผ่านยาวเกินกำหนด";
  if (!/[A-Z]/.test(password)) return "รหัสผ่านต้องมีตัวพิมพ์ใหญ่ (A-Z)";
  if (!/[a-z]/.test(password)) return "รหัสผ่านต้องมีตัวพิมพ์เล็ก (a-z)";
  if (!/[0-9]/.test(password)) return "รหัสผ่านต้องมีตัวเลข (0-9)";
  return null;
}

export function emailError(email: string): string | null {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 120) return "ใส่อีเมลให้ถูกต้อง";
  return null;
}

export function usernameError(username: string): string | null {
  const value = username.trim().replace(/\s+/g, " ");
  if (value.length < 2 || value.length > 24) return "ชื่อผู้ใช้ต้องมี 2–24 ตัว";
  if (!/^[\p{L}\p{M}\p{N} _.-]+$/u.test(value)) return "ชื่อผู้ใช้ใช้ได้แค่ตัวอักษร ตัวเลข และเว้นวรรค";
  return null;
}

export function ageError(age: number): string | null {
  if (!Number.isInteger(age) || age < 10 || age > 100) return "อายุต้องเป็นตัวเลขระหว่าง 10 ถึง 100";
  return null;
}

export function educationError(level: string): string | null {
  if (!EDUCATION_LEVELS.includes(level as EducationLevel)) return "เลือกระดับการศึกษา";
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().replace(/\s+/g, " ");
}

export function codeError(code: string): string | null {
  if (!/^\d{6}$/.test(code)) return "กรอกรหัส 6 หลักที่เป็นตัวเลข";
  return null;
}

export function confirmPasswordError(password: string, confirm: string): string | null {
  if (password !== confirm) return "รหัสยืนยันไม่ตรงกับรหัสใหม่";
  return null;
}
