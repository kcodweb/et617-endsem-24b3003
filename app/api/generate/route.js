// AI feature 1: generate the next question for the learner's level and misconception.
import { askClaude } from "@/lib/claude";
import { pickSeed } from "@/lib/engine";

export const SYSTEM_GENERATE = `You write ONE English grammar practice item for Ravi, a 13-year-old Class 8 learner in Bihar.
His home language is Bhojpuri and his school medium is Hindi. Topic: simple past vs present perfect.
Use simple vocabulary and Indian everyday contexts (school, market, cricket, train, village, family).
Return ONLY JSON:
{"format":"mcq"|"fill"|"fix","rule":"past"|"perfect","prompt":string,"options":string[] (mcq only, 2-3 items),
 "answer":string,"accept":string[],"marker":string}
Rules:
- "rule":"past" means the sentence has a FINISHED time marker (yesterday, last week, in 2019, ago) -> simple past.
- "rule":"perfect" means the time is connected to now (since, for, ever, never, already, just, yet) -> present perfect.
- "marker" must be the exact time words that appear in "prompt".
- fill: prompt contains ___ followed by the base verb in brackets, e.g. "She ___ (eat) lunch at 2 pm."
- fix: prompt is a sentence containing exactly one tense error; answer is the corrected full sentence.
- level 1 = short single clause; level 2 = everyday sentence with a clear marker; level 3 = two clauses or mixed markers.`;

function valid(q) {
  if (!q || !["mcq", "fill", "fix"].includes(q.format)) return false;
  if (!["past", "perfect"].includes(q.rule)) return false;
  if (typeof q.prompt !== "string" || typeof q.answer !== "string" || typeof q.marker !== "string") return false;
  // The time marker must actually be in the sentence.
  if (!q.prompt.toLowerCase().includes(q.marker.toLowerCase())) return false;
  // The answer's tense must agree with the rule (a finished-time item must not have a "have/has" answer).
  const perfect = /\b(have|has|'ve)\b/i.test(q.answer);
  if (q.rule === "past" && perfect) return false;
  if (q.rule === "perfect" && !perfect) return false;
  if (q.format === "mcq" && (!Array.isArray(q.options) || !q.options.includes(q.answer))) return false;
  if (q.format === "fill" && !q.prompt.includes("___")) return false;
  return true;
}

export async function POST(req) {
  const { level = 1, rule = "past", lastMisconception = null, usedIds = [], recent = [] } = await req.json();
  const user = `Level: ${level}. Target rule: ${rule}. Learner's last misconception: ${lastMisconception || "none"}.
Do not repeat these sentences: ${JSON.stringify(recent)}.`;
  try {
    const q = await askClaude(SYSTEM_GENERATE, user);
    if (!valid(q)) throw new Error("invalid");
    q.accept = [q.answer, ...(Array.isArray(q.accept) ? q.accept : [])];
    return Response.json({ ...q, id: "ai-" + Date.now(), level, source: "ai" });
  } catch (e) {
    const seed = pickSeed(level, usedIds, rule);
    return Response.json({ ...seed, source: "offline", reason: String(e.message || e) });
  }
}
