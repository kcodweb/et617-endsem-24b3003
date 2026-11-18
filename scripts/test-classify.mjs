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
  // level 3 (Task 7): multi-blank and multi-sentence items
  ["q10", "have known … met", "correct"],
  ["q10", "have known, met", "correct"],
  ["q10", "know … met", "M2"],
  ["q10", "have known … have met", "M1"],
  ["q11", "has gone", "correct"],
  ["q11", "went", "other"],
  ["q12", "did reach", "correct"],
  ["q12", "have … reached", "M1"],
  ["q13", "Yesterday I went to the market. I have lived in Patna since 2019.", "correct"],
  ["q13", "Yesterday I went to the market. I am living in Patna since 2019.", "M2"],
  ["q13", "Yesterday I have gone to the market. I have lived in Patna since 2019.", "M1"],
];

// An AI-style item whose answer is "has been living": the plain present perfect must also count.
const ai = { id: "ai", format: "fix", rule: "perfect", prompt: "My uncle is living in Patna since 2015.",
  answer: "My uncle has been living in Patna since 2015.", accept: [], marker: "since 2015" };
const extra = [
  [ai, "My uncle has lived in Patna since 2015.", "correct"],
  [ai, "My uncle is living in Patna since 2015.", "M2"],
];

// Every case as [item, response, expected]; a missing bank id is a failure, not a silent skip.
const all = [...cases.map(([id, r, e]) => [byId(id) || { id, missing: true }, r, e]), ...extra];

let passed = 0, failed = 0;
for (const [q, response, expected] of all) {
  if (q.missing) { failed++; console.log(`FAIL  ${q.id} not in bank`); continue; }
  const got = classify(q, response);
  const ok = got === expected;
  ok ? passed++ : failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${q.id.padEnd(4)} ${got.padEnd(7)} (expected ${expected.padEnd(7)})  "${response}"`);
}
console.log(`\n${passed} passed, ${failed} failed (${all.length} cases)`);
process.exit(failed ? 1 : 0);
