export type FocusLike = {
  userId: string;
  subjectId: string | null;
  status: string;
  startedAt: string;
  runningSince: string | null;
  bankedSeconds: number;
};

export type SubjectTotal = { name: string; seconds: number };
export type TodayFocus = { total: number; bySubject: SubjectTotal[]; reading: boolean };

export function bangkokMidnight(now: Date): number {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return Date.parse(`${key}T00:00:00+07:00`);
}

function liveSeconds(session: FocusLike, nowMs: number): number {
  let seconds = session.bankedSeconds;
  if (session.status === "running" && session.runningSince) {
    seconds += Math.max(0, Math.floor((nowMs - Date.parse(session.runningSince)) / 1000));
  }
  return Math.max(0, seconds);
}

/** รวมเวลาทุกวิชาของวันนี้ตามเขตเวลาไทย ไม่ผูกกับห้อง */
export function focusTotals(sessions: FocusLike[], subjectNames: Map<string, string>, userIds: string[], now: Date): Map<string, TodayFocus> {
  const start = bangkokMidnight(now);
  const nowMs = now.getTime();
  const map = new Map<string, TodayFocus>();
  const buckets = new Map<string, Map<string, number>>();
  for (const userId of userIds) map.set(userId, { total: 0, bySubject: [], reading: false });
  for (const session of sessions) {
    if (!map.has(session.userId) || session.status === "cancelled") continue;
    if (Date.parse(session.startedAt) < start) continue;
    const seconds = liveSeconds(session, nowMs);
    const name = (session.subjectId && subjectNames.get(session.subjectId)) || "อื่นๆ";
    const names = buckets.get(session.userId) ?? new Map<string, number>();
    names.set(name, (names.get(name) ?? 0) + seconds);
    buckets.set(session.userId, names);
    if (session.status === "running") {
      const row = map.get(session.userId);
      if (row) row.reading = true;
    }
  }
  for (const [userId, names] of buckets) {
    const bySubject = [...names.entries()].map(([name, seconds]) => ({ name, seconds }));
    const row = map.get(userId);
    if (!row) continue;
    row.bySubject = bySubject;
    row.total = bySubject.reduce((sum, item) => sum + item.seconds, 0);
  }
  return map;
}
