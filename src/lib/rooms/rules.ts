export const SUBJECTS = [
  { id: "thai", name: "ภาษาไทย" },
  { id: "math", name: "คณิตศาสตร์" },
  { id: "science", name: "วิทยาศาสตร์" },
  { id: "english", name: "ภาษาอังกฤษ" },
  { id: "social", name: "สังคมศึกษา" },
] as const;

export type SubjectId = (typeof SUBJECTS)[number]["id"];
export type NamedSubject = { id: string; name: string };

export const MAX_ROOM_SEATS = 20;
export const MAX_ROOM_SUBJECTS = 20;

export type Seat = {
  id: string;
  userId?: string;
  displayName: string;
  subjectId: string | null;
  reading: boolean;
  todaySeconds: number;
  subjectSeconds: Partial<Record<string, number>>;
  bySubject?: { name: string; seconds: number }[];
  dayKey: string;
  lastTickAt: number | null;
};

const MAX_GAP_SECONDS = 12;

export function bangkokDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isSubjectId(value: string): value is SubjectId {
  return SUBJECTS.some((subject) => subject.id === value);
}

export function defaultSubjects(): NamedSubject[] {
  return SUBJECTS.map((subject) => ({ id: subject.id, name: subject.name }));
}

export function mergeSubjects(extra: NamedSubject[] | undefined): NamedSubject[] {
  const list = defaultSubjects();
  for (const item of extra ?? []) {
    const name = item.name.trim().replace(/\s+/g, " ");
    if (!item.id || !name || name.length > 30) continue;
    if (list.some((subject) => subject.id === item.id || subject.name === name)) continue;
    list.push({ id: item.id, name });
    if (list.length >= MAX_ROOM_SUBJECTS) break;
  }
  return list;
}

export function subjectName(id: string | null, subjects: NamedSubject[] = defaultSubjects()): string {
  return subjects.find((subject) => subject.id === id)?.name ?? "ยังไม่เลือกวิชา";
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function rollSeatDay(seat: Seat, dayKey: string): Seat {
  if (seat.dayKey === dayKey) return seat;
  return { ...seat, dayKey, todaySeconds: 0, subjectSeconds: {}, reading: false, lastTickAt: null };
}

export function applyTick(seat: Seat, nowMs: number, reading: boolean, subjectId: string | null, dayKey: string): Seat {
  const current = rollSeatDay(seat, dayKey);
  let todaySeconds = current.todaySeconds;
  const subjectSeconds = { ...current.subjectSeconds };
  if (current.reading && current.lastTickAt !== null && current.subjectId) {
    const gap = Math.min(MAX_GAP_SECONDS, Math.max(0, (nowMs - current.lastTickAt) / 1000));
    const whole = Math.floor(gap);
    todaySeconds += whole;
    subjectSeconds[current.subjectId] = (subjectSeconds[current.subjectId] ?? 0) + whole;
  }
  return {
    ...current,
    todaySeconds,
    subjectSeconds,
    subjectId: reading ? subjectId : current.subjectId,
    reading: reading && subjectId !== null,
    lastTickAt: reading && subjectId !== null ? nowMs : null,
  };
}
