import assert from "node:assert/strict";
import test from "node:test";
import { applyTick, bangkokDayKey, formatClock, rollSeatDay, type Seat } from "../src/lib/rooms/rules.ts";

const seat = (patch: Partial<Seat> = {}): Seat => ({
  id: "1",
  displayName: "ไข่",
  subjectId: "thai",
  reading: false,
  todaySeconds: 0,
  subjectSeconds: {},
  dayKey: "2026-10-21",
  lastTickAt: null,
  ...patch,
});

test("bangkok day uses the Thai calendar date", () => {
  assert.equal(bangkokDayKey(new Date("2026-10-20T17:30:00.000Z")), "2026-10-21");
});

test("a new day clears yesterday and does not keep the timer running", () => {
  const next = rollSeatDay(seat({ todaySeconds: 90, reading: true, lastTickAt: 1, subjectSeconds: { thai: 90 } }), "2026-10-22");
  assert.equal(next.todaySeconds, 0);
  assert.equal(next.reading, false);
  assert.deepEqual(next.subjectSeconds, {});
});

test("reading time accrues to the selected subject and stops on a pause", () => {
  const started = applyTick(seat(), 1_000, true, "math", "2026-10-21");
  const accrued = applyTick(started, 6_000, true, "math", "2026-10-21");
  assert.equal(accrued.todaySeconds, 5);
  assert.equal(accrued.subjectSeconds.math, 5);
  const paused = applyTick(accrued, 9_000, false, "math", "2026-10-21");
  assert.equal(paused.reading, false);
  assert.equal(paused.todaySeconds, 8);
  assert.equal(formatClock(paused.todaySeconds), "00:00:08");
});
