import { loadJson, saveJson } from "@/lib/persist";

type Hit = { userId: string; bucket: string; at: number };
type Db = { hits: Hit[] };

let chain: Promise<unknown> = Promise.resolve();

async function readDb(): Promise<Db> {
  const raw = await loadJson("rate.json");
  const parsed = raw && typeof raw === "object" ? raw as Partial<Db> : {};
  return { hits: Array.isArray(parsed.hits) ? parsed.hits : [] };
}

/** true เมื่อยังไม่เกินโควตาในหน้าต่างเวลานี้ */
export function allowRate(userId: string, bucket: string, limit: number, windowMs: number): Promise<boolean> {
  const run = chain.then(() => readDb()).then(async (db) => {
    const now = Date.now();
    db.hits = db.hits.filter((hit) => now - hit.at < Math.max(windowMs, 120_000));
    const used = db.hits.filter((hit) => hit.userId === userId && hit.bucket === bucket && now - hit.at < windowMs).length;
    if (used >= limit) {
      await saveJson("rate.json", db);
      return false;
    }
    db.hits.push({ userId, bucket, at: now });
    await saveJson("rate.json", db);
    return true;
  });
  chain = run.then(() => undefined, () => undefined);
  return run;
}
