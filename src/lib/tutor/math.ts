import { create, all } from "mathjs";
import nerdamer from "nerdamer";
import "nerdamer/Algebra.js";
import "nerdamer/Calculus.js";
import "nerdamer/Solve.js";
import { z } from "zod";

const math = create(all);
const ev = math.evaluate.bind(math);
const off = () => { throw new Error("disabled"); };
math.import({ import: off, createUnit: off, evaluate: off, parse: off, simplify: off, derivative: off }, { override: true });

const mat = z.array(z.array(z.number()).min(1).max(8)).min(1).max(8);
export const MathInput = z.object({
  op: z.enum(["evaluate", "derivative", "integral", "definite_integral", "limit", "solve", "matrix"]),
  expr: z.string().trim().min(1).max(300).optional(),
  variable: z.string().regex(/^[a-z]$/).default("x"),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
  point: z.string().max(40).optional(),
  matrix_op: z.enum(["det", "inverse", "transpose", "multiply", "add", "eigenvalues"]).optional(),
  matrix_a: mat.optional(),
  matrix_b: mat.optional(),
});

export const MATH_TOOL = {
  name: "calculate",
  description: "Exact math engine. Use for ALL arithmetic, algebra, derivatives, integrals, definite integrals, limits, equation solving and matrix operations. Syntax: x^2, sin(x), sqrt(x), e^x, log(x), pi.",
  input_schema: {
    type: "object" as const,
    properties: {
      op: { type: "string", enum: ["evaluate", "derivative", "integral", "definite_integral", "limit", "solve", "matrix"] },
      expr: { type: "string", description: "expression, or equation like x^2-4=0 for solve" },
      variable: { type: "string", description: "single letter, default x" },
      from: { type: "string" },
      to: { type: "string" },
      point: { type: "string", description: "limit point" },
      matrix_op: { type: "string", enum: ["det", "inverse", "transpose", "multiply", "add", "eigenvalues"] },
      matrix_a: { type: "array", items: { type: "array", items: { type: "number" } } },
      matrix_b: { type: "array", items: { type: "array", items: { type: "number" } } },
    },
    required: ["op"],
  },
};

type Out = { ok: boolean; result?: string; error?: string };
const ok = (result: string): Out => ({ ok: true, result });
const fm = (value: unknown) => math.format(value as never, { precision: 10 });

export function runMath(raw: unknown): Out {
  const parsed = MathInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "รูปแบบคำสั่งไม่ถูกต้อง" };
  const input = parsed.data;
  const variable = input.variable;
  try {
    const expr = () => {
      if (!input.expr) throw new Error("ต้องมี expr");
      return input.expr;
    };
    switch (input.op) {
      case "evaluate": return ok(fm(ev(expr())));
      case "derivative": return ok(nerdamer(`diff(${expr()},${variable})`).toString());
      case "integral": return ok(`${nerdamer(`integrate(${expr()},${variable})`).toString()} + C`);
      case "definite_integral":
        if (input.from == null || input.to == null) throw new Error("ต้องมี from และ to");
        return ok(nerdamer(`defint(${expr()},${input.from},${input.to},${variable})`).toString());
      case "limit":
        if (input.point == null) throw new Error("ต้องมี point");
        return ok(nerdamer(`limit(${expr()},${variable},${input.point})`).toString());
      case "solve": return ok(String(nerdamer.solve(expr(), variable).toString()));
      case "matrix": {
        const left = input.matrix_a;
        const right = input.matrix_b;
        if (!left || !input.matrix_op) throw new Error("ต้องมี matrix_a และ matrix_op");
        switch (input.matrix_op) {
          case "det": return ok(fm(math.det(left)));
          case "inverse": return ok(fm(math.inv(left)));
          case "transpose": return ok(fm(math.transpose(left)));
          case "multiply": if (!right) throw new Error("ต้องมี matrix_b"); return ok(fm(math.multiply(left, right)));
          case "add": if (!right) throw new Error("ต้องมี matrix_b"); return ok(fm(math.add(left, right)));
          case "eigenvalues": return ok(fm((math.eigs(left) as unknown as { values: unknown }).values));
        }
      }
    }
  } catch (err) {
    return { ok: false, error: "คำนวณไม่ได้: " + (err instanceof Error ? err.message : "unknown") };
  }
  return { ok: false, error: "ไม่รองรับคำสั่งนี้" };
}
