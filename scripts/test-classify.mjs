// Run: node scripts/test-classify.mjs
import { classify } from "../lib/engine.js";
import { byId } from "../lib/bank.js";

const cases = [
  ["q4", "I saw the film last Sunday", "correct"],
  ["q4", "I have seen the film last Sunday", "M1"],
  ["q6", "I have known her since five years", "correct"],
  ["q6", "I know her for five years", "M2"],
  ["q2", "am living", "M2"],
  ["q1", "have finished", "M1"],
  ["q3", "Did … see", "M3"],
  ["q5", "bought", "correct"],
];

let failed = 0;
for (const [id, response, expected] of cases) {
  const q = byId(id);
  if (!q) { console.log(`SKIP  ${id} not in bank`); continue; }
  const got = classify(q, response);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${id.padEnd(4)} ${got.padEnd(7)} (expected ${expected.padEnd(7)})  "${response}"`);
}
console.log(failed ? `\n${failed} failed` : `\nAll ${cases.length} passed`);
process.exit(failed ? 1 : 0);
