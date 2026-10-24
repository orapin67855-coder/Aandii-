import { loadJson, saveJson } from "@/lib/persist";
import { buildDailyPlan, computeReadiness, type DailyPlan, type ReadinessInput, type ReadinessLevel } from "@/lib/readiness/score";

export type SavedPlan = {
  userId: string;
  dayKey: string;
  score: number;
  level: ReadinessLevel;
  message: string;
  daily: DailyPlan;
  checkedAt?: string;
};

type Db = { plans: SavedPlan[] };

let chain: Promise<unknown> = Promise.resolve();

function dayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

async function readDb(): Promise<Db> {
  const raw = await loadJson("readiness.json");
  const parsed = raw && typeof raw === "object" ? raw as Partial<Db> : {};
  return { plans: Array.isArray(parsed.plans) ? parsed.plans : [] };
}

function update<T>(fn: (db: Db) => T): Promise<T> {
  const run = chain.then(() => readDb()).then(async (db) => {
    const result = fn(db);
    await saveJson("readiness.json", db);
    return result;
  });
  chain = run.then(() => undefined, () => undefined);
  return run;
}

export function todayPlan(userId: string): Promise<SavedPlan | null> {
  const key = dayKey();
  return update((db) => db.plans.find((item) => item.userId === userId && item.dayKey === key) ?? null);
}

export function saveReadiness(userId: string, input: ReadinessInput): Promise<SavedPlan> {
  const result = computeReadiness(input);
  const saved: SavedPlan = {
    userId,
    dayKey: dayKey(),
    score: result.score,
    level: result.level,
    message: result.plan.message,
    daily: buildDailyPlan(result, input.sleepHours),
    checkedAt: new Date().toISOString(),
  };
  return update((db) => {
    db.plans = db.plans.filter((item) => !(item.userId === userId && item.dayKey === saved.dayKey));
    db.plans.push(saved);
    return saved;
  });
}
