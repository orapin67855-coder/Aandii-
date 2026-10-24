import assert from "node:assert/strict";
import test from "node:test";
import { tutorReply } from "../src/lib/tutor/reply.ts";

test("the tutor does not explain a question that is still waiting for review", () => {
  const answer = tutorReply({ review: "pending", prompt: "ถ้า 2x + 3 = 11", explanation: "ได้ x = 4", options: ["3", "4"], answer: 1 });
  assert.equal(answer.steps.length, 0);
  assert.equal(answer.text.includes("x = 4"), false);
  assert.equal(answer.text.includes("รอคนตรวจ"), true);
});

test("an unknown question is not answered by guessing", () => {
  const answer = tutorReply(undefined);
  assert.equal(answer.steps.length, 0);
});
