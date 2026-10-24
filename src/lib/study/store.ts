import { randomUUID } from "node:crypto";
import { loadJson, saveJson } from "@/lib/persist";
import { bangkokParts, weekDateKeys } from "@/lib/study/stats";
import { focusTotals, type TodayFocus } from "@/lib/study/today";

type Status = "running" | "paused" | "completed" | "cancelled";

type Subject = { id: string; userId: string; name: string };

type FocusSession = {
  id: string;
  userId: string;
  subjectId: string | null;
  status: Status;
  startedAt: string;
  runningSince: string | null;
  bankedSeconds: number;
  endedAt: string | null;
};

type Db = { sessions: FocusSession[]; subjects: Subject[] };

const DEFAULT_SUBJECTS = ["ภาษาไทย", "ภาษาอังกฤษ", "คณิตศาสตร์", "วิทยาศาสตร์", "อื่นๆ"];

let chain: Promise<unknown> = Promise.resolve();

export type FocusView = {
  id: string;
  status: Status;
  subjectId: string | null;
  subjectName: string;
  bankedSeconds: number;
  runningSince: string | null;
};

export type SubjectView = { id: string; name: string };

function live(session: FocusSession, now = Date.now()): number {
  let seconds = session.bankedSeconds;
  if (session.status === "running" && session.runningSince) {
    seconds += Math.max(0, Math.floor((now - Date.parse(session.runningSince)) / 1000));
  }
  return Math.max(0, seconds);
}

function view(db: Db, session: FocusSession): FocusView {
  return {
    id: session.id,
    status: session.status,
    subjectId: session.subjectId,
    subjectName: db.subjects.find((item) => item.id === session.subjectId)?.name ?? "อื่นๆ",
    bankedSeconds: session.status === "running" ? session.bankedSeconds : live(session),
    runningSince: session.runningSince,
  };
}

async function readDb(): Promise<Db> {
  const raw = await loadJson("study.json");
  const parsed = raw && typeof raw === "object" ? raw as Partial<Db> : {};
  const sessions = Array.isArray(parsed.sessions) ? parsed.sessions.map((session) => ({
    ...session,
    subjectId: session.subjectId ?? null,
    bankedSeconds: session.bankedSeconds ?? 0,
  })) : [];
  return { sessions, subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [] };
}

async function writeDb(db: Db): Promise<void> {
  await saveJson("study.json", db);
}

function update<T>(fn: (db: Db) => T): Promise<T> {
  const run = chain.then(() => readDb()).then(async (db) => {
    const result = fn(db);
    await writeDb(db);
    return result;
  });
  chain = run.then(() => undefined, () => undefined);
  return run;
}

function peek<T>(fn: (db: Db) => T): Promise<T> {
  const run = chain.then(() => readDb()).then((db) => fn(db));
  chain = run.then(() => undefined, () => undefined);
  return run;
}

function openSession(db: Db, userId: string): FocusSession | undefined {
  return db.sessions.find((session) => session.userId === userId && (session.status === "running" || session.status === "paused"));
}

function bank(session: FocusSession) {
  session.bankedSeconds = live(session);
  session.runningSince = null;
}

function complete(session: FocusSession) {
  bank(session);
  session.status = "completed";
  session.endedAt = new Date().toISOString();
}

function ensureDefaults(db: Db, userId: string) {
  if (db.subjects.some((item) => item.userId === userId)) return;
  for (const name of DEFAULT_SUBJECTS) db.subjects.push({ id: randomUUID(), userId, name });
}

function named(db: Db, userId: string, name: string): Subject | undefined {
  return db.subjects.find((item) => item.userId === userId && item.name === name);
}

function ensureNamed(db: Db, userId: string, name: string): Subject | null {
  ensureDefaults(db, userId);
  const found = named(db, userId, name);
  if (found) return found;
  if (db.subjects.filter((item) => item.userId === userId).length >= 20) return null;
  const created = { id: randomUUID(), userId, name };
  db.subjects.push(created);
  return created;
}

function begin(db: Db, userId: string, subject: Subject): FocusSession {
  const now = new Date().toISOString();
  const session: FocusSession = {
    id: randomUUID(),
    userId,
    subjectId: subject.id,
    status: "running",
    startedAt: now,
    runningSince: now,
    bankedSeconds: 0,
    endedAt: null,
  };
  db.sessions.push(session);
  return session;
}

export function listSubjects(userId: string): Promise<SubjectView[]> {
  return update((db) => {
    ensureDefaults(db, userId);
    return db.subjects.filter((item) => item.userId === userId).map(({ id, name }) => ({ id, name }));
  });
}

export function addSubject(userId: string, rawName: string): Promise<{ ok: true; subject: SubjectView } | { ok: false; message: string }> {
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 30) return Promise.resolve({ ok: false, message: "ชื่อวิชาต้องมี 1–30 ตัวอักษร" });
  return update((db) => {
    ensureDefaults(db, userId);
    const existing = named(db, userId, name);
    if (existing) return { ok: true as const, subject: { id: existing.id, name: existing.name } };
    if (db.subjects.filter((item) => item.userId === userId).length >= 20) {
      return { ok: false as const, message: "เพิ่มได้ไม่เกิน 20 วิชา" };
    }
    const subject = { id: randomUUID(), userId, name };
    db.subjects.push(subject);
    return { ok: true as const, subject: { id: subject.id, name: subject.name } };
  });
}

export function focusState(userId: string): Promise<FocusView | null> {
  return update((db) => {
    const session = openSession(db, userId);
    return session ? view(db, session) : null;
  });
}

export function startFocus(userId: string, subjectId: string): Promise<{ ok: true; session: FocusView } | { ok: false; message: string }> {
  return update((db) => {
    ensureDefaults(db, userId);
    const subject = db.subjects.find((item) => item.id === subjectId && item.userId === userId);
    if (!subject) return { ok: false as const, message: "ไม่พบวิชานี้" };
    const existing = openSession(db, userId);
    if (existing) {
      if (existing.subjectId === subject.id) {
        if (existing.status === "paused") {
          existing.runningSince = new Date().toISOString();
          existing.status = "running";
        }
        return { ok: true as const, session: view(db, existing) };
      }
      complete(existing);
    }
    return { ok: true as const, session: view(db, begin(db, userId, subject)) };
  });
}

export function pauseFocus(userId: string): Promise<FocusView | null> {
  return update((db) => {
    const session = openSession(db, userId);
    if (!session || session.status !== "running") return session ? view(db, session) : null;
    bank(session);
    session.status = "paused";
    return view(db, session);
  });
}

export function resumeFocus(userId: string): Promise<FocusView | null> {
  return update((db) => {
    const session = openSession(db, userId);
    if (!session || session.status !== "paused") return session ? view(db, session) : null;
    session.runningSince = new Date().toISOString();
    session.status = "running";
    return view(db, session);
  });
}

export function completeFocus(userId: string): Promise<FocusView | null> {
  return update((db) => {
    const session = openSession(db, userId);
    if (!session) return null;
    complete(session);
    return view(db, session);
  });
}

export function cancelFocus(userId: string): Promise<void> {
  return update((db) => {
    const session = openSession(db, userId);
    if (!session) return;
    session.bankedSeconds = 0;
    session.runningSince = null;
    session.status = "cancelled";
    session.endedAt = new Date().toISOString();
  });
}

/** เวลาที่อ่านในห้องใช้คลังโฟกัสชุดเดียวกัน จึงไปรวมทุกห้องที่บัญชีนี้อยู่ */
export function syncFocusFromRoom(userId: string, subjectName: string | null, reading: boolean): Promise<void> {
  return update((db) => {
    const open = openSession(db, userId);
    if (!reading || !subjectName) {
      if (open?.status === "running") {
        bank(open);
        open.status = "paused";
      }
      return;
    }
    const subject = ensureNamed(db, userId, subjectName);
    if (!subject) return;
    if (open?.subjectId === subject.id) {
      if (open.status === "paused") {
        open.runningSince = new Date().toISOString();
        open.status = "running";
      }
      return;
    }
    if (open) complete(open);
    begin(db, userId, subject);
  });
}

export function todayFocusMap(userIds: string[], now = new Date()): Promise<Map<string, TodayFocus>> {
  return peek((db) => focusTotals(
    db.sessions,
    new Map(db.subjects.map((item) => [item.id, item.name])),
    userIds,
    now,
  ));
}

export function weekFocusSeconds(userId: string, now = new Date()): Promise<number[]> {
  const keys = weekDateKeys(now);
  return peek((db) => {
    const totals = keys.map(() => 0);
    for (const session of db.sessions) {
      if (session.userId !== userId || session.status !== "completed" || !session.endedAt) continue;
      const key = bangkokParts(new Date(session.endedAt)).key;
      const index = keys.indexOf(key);
      if (index >= 0) totals[index] += session.bankedSeconds;
    }
    return totals;
  });
}

const WEEK_LABELS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
const MONTH_LABELS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function focusChart(userId: string, span: "week" | "month" | "year", now = new Date()): Promise<{ labels: string[]; minutes: number[] }> {
  return peek((db) => {
    const minutesFor = (keys: string[], yearMode: boolean) => {
      const totals = keys.map(() => 0);
      for (const session of db.sessions) {
        if (session.userId !== userId || session.status !== "completed" || !session.endedAt) continue;
        const key = bangkokParts(new Date(session.endedAt)).key;
        const bucket = yearMode ? key.slice(0, 7) : key;
        const index = keys.indexOf(bucket);
        if (index >= 0) totals[index] += session.bankedSeconds;
      }
      return totals.map((seconds) => Math.floor(seconds / 60));
    };
    if (span === "week") return { labels: WEEK_LABELS, minutes: minutesFor(weekDateKeys(now), false) };
    const [year, month] = bangkokParts(now).key.split("-");
    if (span === "month") {
      const count = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
      const keys = Array.from({ length: count }, (_, index) => `${year}-${month}-${String(index + 1).padStart(2, "0")}`);
      return { labels: keys.map((_, index) => String(index + 1)), minutes: minutesFor(keys, false) };
    }
    const keys = MONTH_LABELS.map((_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
    return { labels: MONTH_LABELS, minutes: minutesFor(keys, true) };
  });
}
