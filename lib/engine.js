// Adaptive engine: classify the answer, then decide the next step.
import { BANK } from "./bank.js";

// A correct answer that took longer than this (or used the hint) is not yet secure -> stay at the same level.
export const SLOW_MS = 45000;

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.!?,"“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const words = (s) => (s || "").toLowerCase().replace(/[’']/g, "'").match(/[a-z']+/g) || [];
const HAVE = "(?:have|has|'ve)";
const AUX = new Set(["have", "has", "'ve"]);
const ING = /\b(am|is|are|'m|'re)\s+\w+ing\b/;
const EXPERIENCE = /\b(ever|never|just|already|yet)\b/i;

// Irregular verbs: base, V2 (simple past), V3 (past participle).
const IRREGULAR = [
  ["go", "went", "gone"], ["see", "saw", "seen"], ["know", "knew", "known"], ["meet", "met", "met"],
  ["buy", "bought", "bought"], ["eat", "ate", "eaten"], ["take", "took", "taken"], ["write", "wrote", "written"],
  ["come", "came", "come"], ["give", "gave", "given"], ["do", "did", "done"], ["leave", "left", "left"],
  ["make", "made", "made"], ["have", "had", "had"], ["get", "got", "got"], ["drink", "drank", "drunk"],
  ["begin", "began", "begun"], ["speak", "spoke", "spoken"], ["break", "broke", "broken"], ["read", "read", "read"],
  ["forget", "forgot", "forgotten"], ["win", "won", "won"], ["teach", "taught", "taught"], ["be", "was", "been"],
];

// Base form of a V2/V3 form (for spotting "I know her" instead of "I have known her").
function baseOf(form) {
  const row = IRREGULAR.find((r) => r[1] === form || r[2] === form);
  if (row) return [row[0]];
  if (form.endsWith("ied")) return [form.slice(0, -3) + "y"];
  if (form.endsWith("ed")) return [form.slice(0, -2), form.slice(0, -1)]; // worked -> work, lived -> live
  return [form];
}

/**
 * The key verb of each answer part: the words in the answer that are not in the prompt (ignoring have/has).
 * Returns [{ rule, verb, base, marker }]. Multi-blank answers ("have known … met") and multi-sentence
 * fixes are split into parts, and each part gets its own rule (has have/has -> perfect, otherwise past).
 */
export function targetVerb(q) {
  let parts;
  if (q.answer.includes("…")) parts = q.answer.split("…");
  else if (q.format === "fix") parts = q.answer.split(/(?<=[.!?])\s+/);
  else parts = [q.answer];
  const promptWords = new Set(words(q.prompt));
  const bases = [...(q.prompt.matchAll(/\((\w+)\)/g))].map((m) => m[1].toLowerCase()); // fill: "(live)"
  return parts.filter((p) => p.trim()).map((p, i) => {
    const w = words(p);
    const rule = w.some((x) => AUX.has(x)) ? "perfect" : "past";
    const diff = w.filter((x) => !AUX.has(x) && !promptWords.has(x));
    const verb = diff[0] || w.filter((x) => !AUX.has(x)).pop();
    const base = bases[i] ? [bases[i]] : baseOf(verb);
    return { rule, verb, base, marker: q.parts?.[i]?.marker || q.marker };
  });
}

const has = (r, re) => new RegExp(re).test(r);

/**
 * Classify a learner answer for MCQ / fill / fix items.
 * Returns { verdict, marker } where verdict is "correct" | "M1" | "M2" | "M3" | "other".
 *   M1 = present perfect used with a finished-time marker (should be simple past)
 *   M2 = present continuous / simple present used with since/for (should be present perfect)
 *   M3 = simple past ("did") used with ever/never/just/already/yet (should be present perfect)
 */
export function classifyDetail(q, response) {
  const r = norm(response);
  const ok = [q.answer, ...(q.accept || [])].map(norm);
  if (ok.includes(r)) return { verdict: "correct", marker: q.marker };

  if (q.format === "mcq") {
    if (q.rule === "past" && /\b(have|has)\b/.test(r)) return { verdict: "M1", marker: q.marker };
    if (q.rule === "perfect" && ING.test(r)) return { verdict: "M2", marker: q.marker };
    if (q.rule === "perfect" && !/\b(have|has)\b/.test(r) && EXPERIENCE.test(q.prompt))
      return { verdict: "M3", marker: q.marker };
    return { verdict: "other", marker: q.marker };
  }

  // fill / fix: grade the tense of each key verb, not the exact wording.
  const parts = targetVerb(q);
  const perfectParts = parts.filter((p) => p.rule === "perfect").length;
  const haveCount = (r.match(/\b(have|has|'ve)\b/g) || []).length;
  const graded = parts.map((p) => {
    if (p.rule === "past") {
      const present = has(r, `\\b${p.verb}\\b`);
      const afterHave = has(r, `\\b${HAVE}\\s+(\\w+\\s+)?${p.verb}\\b`);
      const strayHave = parts.length === 1 && haveCount > 0; // single past item: no have/has at all
      return present && !afterHave && !strayHave;
    }
    return has(r, `\\b${HAVE}\\s+(\\w+\\s+)?${p.verb}\\b`);
  });
  if (graded.every(Boolean)) return { verdict: "correct", marker: q.marker };

  const i = graded.findIndex((g) => !g);
  const p = parts[i];
  if (p.rule === "past" && haveCount > perfectParts) return { verdict: "M1", marker: p.marker };
  if (p.rule === "perfect") {
    const bare = p.base.some((b) => has(r, `\\b(${b}|${b}s|${b}es)\\b`) && !has(r, `\\b${HAVE}\\s+(\\w+\\s+)?${b}\\b`));
    if (ING.test(r) || bare) return { verdict: "M2", marker: p.marker };
    if (/\bdid\b/.test(r) && EXPERIENCE.test(p.marker)) return { verdict: "M3", marker: p.marker };
  }
  return { verdict: "other", marker: p.marker };
}

export function classify(q, response) {
  return classifyDetail(q, response).verdict;
}

/**
 * Decision rule (design challenge), using performance AND interaction (hint use, response time):
 *   correct, no hint, <= 45 s           -> "harder"        (level + 1)
 *   correct but hint used or > 45 s     -> "same"          (same level, new question)
 *   M1/M2/M3 for the 2nd time           -> "prerequisite"  (mini-lesson on time words, then level - 1)
 *   other error, or first M1/M2/M3      -> "alternative"   (timeline re-explanation + similar item, same level)
 */
export function decide(verdict, history, { hintUsed = false, timeTakenMs = 0 } = {}) {
  if (verdict === "correct") return hintUsed || timeTakenMs > SLOW_MS ? "same" : "harder";
  if (verdict === "M1" || verdict === "M2" || verdict === "M3") {
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

// Hint: names the time word without giving the answer.
export const HINT = {
  en: (q) => (q.rule === "past" ? `Look at “${q.marker}”. Is that time finished?` : `Look at “${q.marker}”. Does it reach NOW?`),
  hi: (q) =>
    q.rule === "past"
      ? `“${q.marker}” ko dekho. Kya yeh samay khatam ho chuka hai?`
      : `“${q.marker}” ko dekho. Kya yeh abhi tak (NOW tak) pahunchta hai?`,
};

// The answer without a final full stop, so feedback never ends in “….”.
const ans = (q) => q.answer.replace(/\.$/, "");

// Fixed, teacher-written feedback (also the fallback when the AI is unavailable).
// Each entry has an English version (school medium) and a short Roman-script Hindi version (home language),
// shown when the learner turns on "Hindi mein samjhao".
export const FEEDBACK = {
  correct: {
    en: (q) => `Sahi! “${q.marker}” tells us the time, so “${ans(q)}” is right.`,
    hi: (q) => `Sahi! “${q.marker}” se samay pata chalta hai, isliye “${ans(q)}” bilkul sahi hai.`,
  },
  M1: {
    en: (q) =>
      `You used have/has + V3 with “${q.marker}”. “${q.marker}” is a FINISHED time, so English uses the simple past here. Correct: “${ans(q)}”. (In Hindi “kal gaya hoon” is fine, but in English have/has + V3 cannot go with “${q.marker}”.)`,
    hi: (q) =>
      `“${q.marker}” khatam ho chuka samay hai. Hindi mein “kal gaya hoon” chalta hai, par English mein iske saath “have + V3” nahi aata — simple past aata hai. Sahi jawab: “${ans(q)}”.`,
  },
  M2: {
    en: (q) =>
      `“${q.marker}” connects the past to NOW. English uses have/has + V3 here, not “am/is …ing”. Correct: “${ans(q)}”.`,
    hi: (q) =>
      `“${q.marker}” ka matlab hai: tab se ab tak. Hindi mein “2020 se reh raha hoon” chalta hai, par English mein yahan “am/is …ing” nahi, “have/has + V3” aata hai. Sahi jawab: “${ans(q)}”.`,
  },
  M3: {
    en: (q) =>
      `Achha try! “${q.marker}” asks about your life up to NOW, so English uses have/has + V3, not “did”. Correct: “${ans(q)}”.`,
    hi: (q) =>
      `“${q.marker}” ka matlab: ab tak ki zindagi mein. Isliye “did” nahi, “have/has + V3” aata hai. Sahi jawab: “${ans(q)}”.`,
  },
  other: {
    en: (q) => `Achha try! Look carefully at the time word “${q.marker}”. Correct answer: “${ans(q)}”.`,
    hi: (q) => `Achha try! Time wale shabd “${q.marker}” ko dhyan se dekho. Sahi jawab: “${ans(q)}”.`,
  },
};
