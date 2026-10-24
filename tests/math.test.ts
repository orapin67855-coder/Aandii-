import assert from "node:assert/strict";
import test from "node:test";
import { runMath } from "../src/lib/tutor/math.ts";

test("derivative, integral, limit, solve, and a 2x2 determinant", () => {
  const derivative = runMath({ op: "derivative", expr: "x^3*sin(x)", variable: "x" });
  assert.equal(derivative.ok, true);
  assert.match(derivative.result ?? "", /sin/);
  assert.match(derivative.result ?? "", /cos/);

  const integral = runMath({ op: "integral", expr: "x*e^x", variable: "x" });
  assert.equal(integral.ok, true);
  assert.match(integral.result ?? "", /e\^x/);
  assert.match(integral.result ?? "", /\+ C/);

  const limit = runMath({ op: "limit", expr: "sin(x)/x", variable: "x", point: "0" });
  assert.equal(limit.ok, true);
  assert.equal(limit.result, "1");

  const solved = runMath({ op: "solve", expr: "x^2-4=0", variable: "x" });
  assert.equal(solved.ok, true);
  assert.match(solved.result ?? "", /-2/);
  assert.match(solved.result ?? "", /2/);

  const det = runMath({ op: "matrix", matrix_op: "det", matrix_a: [[1, 2], [3, 4]] });
  assert.equal(det.ok, true);
  assert.equal(det.result, "-2");

  const det3 = runMath({ op: "matrix", matrix_op: "det", matrix_a: [[2, 0, 0], [0, 3, 0], [0, 0, 4]] });
  assert.equal(det3.ok, true);
  assert.equal(det3.result, "24");
  const inverse = runMath({ op: "matrix", matrix_op: "inverse", matrix_a: [[1, 0, 0], [0, 2, 0], [0, 0, 1]] });
  assert.equal(inverse.ok, true);
});

test("a too-long expression and a disabled import are rejected", () => {
  assert.equal(runMath({ op: "evaluate", expr: "1+".repeat(200) }).ok, false);
  assert.equal(runMath({ op: "evaluate", expr: "import('fs')" }).ok, false);
});
