import { loadJson, saveJson } from "@/lib/persist";
import type { PlacementLevel } from "@/lib/placement/bank";

export type SavedPlacement = {
  userId: string;
  takenAt: string;
  correct: number;
  total: number;
  level: PlacementLevel;
  note: string;
  bySubject: { subject: string; correct: number; total: number }[];
};

type Db = { results: SavedPlacement[] };

let chain: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<Db> {
  const raw = await loadJson("placement.json");
  const parsed = raw && typeof raw === "object" ? raw as Partial<Db> : {};
  return { results: Array.isArray(parsed.results) ? parsed.results : [] };
}

function update<T>(fn: (db: Db) => T): Promise<T> {
  const run = chain.then(() => readDb()).then(async (db) => {
    const result = fn(db);
    await saveJson("placement.json", db);
    return result;
  });
  chain = run.then(() => undefined, () => undefined);
  return run;
}

export async function latestPlacement(userId: string): Promise<SavedPlacement | null> {
  const db = await readDb();
  return db.results.find((item) => item.userId === userId) ?? null;
}

export function storePlacement(saved: SavedPlacement): Promise<SavedPlacement> {
  return update((db) => {
    db.results = db.results.filter((item) => item.userId !== saved.userId);
    db.results.push(saved);
    return saved;
  });
}
