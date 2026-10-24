declare module "nerdamer" {
  interface Nerdamer {
    (expr: string): { toString(): string };
    solve(expr: string, variable: string): { toString(): string };
  }
  const nerdamer: Nerdamer;
  export default nerdamer;
}
declare module "nerdamer/Algebra.js";
declare module "nerdamer/Calculus.js";
declare module "nerdamer/Solve.js";
