// Adaptive engine: classify the answer, then decide the next step.
import { BANK } from "./bank";

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.!?,"“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Words that signal each tense.
const PERFECT_FORM = /\b(have|has|'ve|'s)\s+(\w+ed|been|gone|seen|done|known|eaten|bought|met|left|lived|finished|taken|written|come|had|made|given)\b/;
const CONTINUOUS_OR_PRESENT = /\b(am|is|are)\s+\w+ing\b|\b(am|is|are)\s+knowing\b|\b(know|live|stay)\b/;

/**
 * Classify a learner answer for MCQ / fill / fix items.
 * Returns "correct" | "M1" | "M2" | "other".
 *   M1 = present perfect used with a finished-time marker (should be simple past)
 *   M2 = present continuous / simple present used with since/for (should be present perfect)
 */
export function classify(q, response) {
  const r = norm(response);
  const ok = [q.answer, ...(q.accept || [])].map(norm);
  if (ok.includes(r)) return "correct";

  if (q.rule === "past" && PERFECT_FORM.test(r)) return "M1";
  if (q.rule === "perfect") {
    if (CONTINUOUS_OR_PRESENT.test(r) && !PERFECT_FORM.test(r)) return "M2";
    // For MCQ "Did … see" vs "Have … seen": choosing the past for an experience question.
    if (q.format === "mcq" && /did/.test(r)) return "other";
  }
  return "other";
}

/**
 * Decision rule (design challenge):
 *   correct                     -> "harder"        (level + 1)
 *   M1/M2 for the 2nd time      -> "prerequisite"  (mini-lesson on time markers, then level - 1)
 *   other, or first M1/M2       -> "alternative"   (timeline re-explanation, same level)
 */
export function decide(verdict, history) {
  if (verdict === "correct") return "harder";
  if (verdict === "M1" || verdict === "M2") {
    const seen = history.filter((h) => h.verdict === verdict).length; // includes the current one
    if (seen >= 2) return "prerequisite";
  }
  return "alternative";
}

export function nextLevel(level, action) {
  if (action === "harder") return Math.min(3, level + 1);
  if (action === "prerequisite") return Math.max(1, level - 1);
  return level;
}

// Pick an unseen seed item at the level; prefer the rule linked to the last misconception.
export function pickSeed(level, usedIds, preferRule) {
  const pool = BANK.filter((q) => q.level === level && !usedIds.includes(q.id));
  const preferred = pool.filter((q) => q.rule === preferRule);
  const list = preferred.length ? preferred : pool;
  if (list.length) return list[0];
  const any = BANK.filter((q) => !usedIds.includes(q.id));
  return any[0] || null;
}

// Fixed, teacher-written feedback (also the fallback when the AI is unavailable).
export const FEEDBACK = {
  correct: (q) => `Sahi! “${q.marker}” tells us the time, so “${q.answer}” is right.`,
  M1: (q) =>
    `You used have/has + V3 with “${q.marker}”. “${q.marker}” is a FINISHED time, so English uses the simple past here. Correct: “${q.answer}”. (In Hindi “kal gaya hoon” is fine, but in English “have gone” cannot go with “yesterday”.)`,
  M2: (q) =>
    `“${q.marker}” connects the past to NOW. English uses have/has + V3 here, not “am/is …ing”. Correct: “${q.answer}”.`,
  other: (q) => `Not quite. Look at the time word “${q.marker}”. Correct answer: “${q.answer}”.`,
};
