import assert from "node:assert/strict";
import test from "node:test";
import { focusTotals } from "../src/lib/study/today.ts";
import { buildDailyPlan, computeReadiness } from "../src/lib/readiness/score.ts";

test("today's focus adds every subject and ignores yesterday", () => {
  const now = new Date("2026-10-21T05:00:00.000Z");
  const totals = focusTotals([
    { userId: "a", subjectId: "thai", status: "completed", startedAt: "2026-10-20T18:00:00.000Z", runningSince: null, bankedSeconds: 3600 },
    { userId: "a", subjectId: "sci", status: "completed", startedAt: "2026-10-20T19:00:00.000Z", runningSince: null, bankedSeconds: 7200 },
    { userId: "a", subjectId: "old", status: "completed", startedAt: "2026-10-20T10:00:00.000Z", runningSince: null, bankedSeconds: 9999 },
  ], new Map([["thai", "ภาษาไทย"], ["sci", "วิทยาศาสตร์"]]), ["a"], now);
  const row = totals.get("a");
  assert.equal(row?.total, 10800);
  assert.equal(row?.bySubject.find((item) => item.name === "ภาษาไทย")?.seconds, 3600);
  assert.equal(row?.bySubject.find((item) => item.name === "วิทยาศาสตร์")?.seconds, 7200);
});

test("a short night lowers the suggested study time", () => {
  const rested = buildDailyPlan(computeReadiness({ sleepHours: 8, sleepQuality: 5, energy: 5, mood: 5, stress: 1 }), 8);
  const tired = buildDailyPlan(computeReadiness({ sleepHours: 5, sleepQuality: 2, energy: 2, mood: 2, stress: 4 }), 5);
  assert.ok(tired.totalStudyMinutes < rested.totalStudyMinutes);
  assert.ok(tired.blocks >= 1);
});
