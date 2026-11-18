// Run: node scripts/test-rules.mjs
import { ruleCheck } from "../lib/rules.js";

const cases = [
  ["since 2020 connects to now so am living is wrong, we use have lived", "since 2020", "correct"],
  ["I know the answer", "yesterday", "other"],
  ["am living is right because since", "since 2020", "M2"],
  ["has left is right because just means it is connected to now", "just", "correct"],
  ["have means past so have met yesterday is fine", "yesterday", "M1"],
  ["because", "yesterday", "other"],
];

let failed = 0;
for (const [response, marker, expected] of cases) {
  const got = ruleCheck(response, marker);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${got.padEnd(7)} (expected ${expected.padEnd(7)})  "${response}"`);
}
console.log(failed ? `\n${failed} failed` : `\nAll ${cases.length} passed`);
process.exit(failed ? 1 : 0);
