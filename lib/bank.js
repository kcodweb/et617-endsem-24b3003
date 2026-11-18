// Seed question bank for P4-T7 (simple past vs present perfect).
// Used as the first items and as the fallback when the AI call fails.
// rule: "past" = finished time -> simple past, "perfect" = connected to now -> present perfect.
// level: 1 = easy, 2 = medium, 3 = hard.

export const BANK = [
  // ---- level 1 ----
  {
    id: "q1", level: 1, format: "mcq", rule: "past",
    prompt: "I ___ my homework yesterday.",
    options: ["finished", "have finished"],
    answer: "finished",
    marker: "yesterday",
  },
  {
    id: "q2", level: 1, format: "fill", rule: "perfect",
    prompt: "We ___ (live) in Patna since 2021.",
    answer: "have lived",
    accept: ["have lived", "'ve lived", "have been living"],
    marker: "since 2021",
  },
  {
    id: "q3", level: 1, format: "mcq", rule: "perfect",
    prompt: "___ you ever ___ a tiger?",
    options: ["Did … see", "Have … seen"],
    answer: "Have … seen",
    marker: "ever",
  },
  // ---- level 2 ----
  {
    id: "q4", level: 2, format: "fix", rule: "past",
    prompt: "I have seen that film last Sunday.",
    answer: "I saw that film last Sunday.",
    accept: ["i saw that film last sunday", "i watched that film last sunday"],
    marker: "last Sunday",
  },
  {
    id: "q5", level: 2, format: "fill", rule: "past",
    prompt: "My father ___ (buy) a new phone last month.",
    answer: "bought",
    accept: ["bought"],
    marker: "last month",
  },
  {
    id: "q6", level: 2, format: "fix", rule: "perfect",
    prompt: "I am knowing her for five years.",
    answer: "I have known her for five years.",
    accept: ["i have known her for five years", "i've known her for five years"],
    marker: "for five years",
  },
  // ---- level 3 ----
  {
    id: "q7", level: 3, format: "explain", rule: "perfect",
    prompt: "Why is this sentence correct? “She has just left the class.”",
    answer: "“Just” connects the action to now, so we use the present perfect (has left).",
    marker: "just",
  },
  {
    id: "q8", level: 3, format: "mcq", rule: "past",
    prompt: "Rani ___ to Delhi three times, but she ___ there in 2019 for the first time.",
    options: ["has been … has gone", "has been … went", "went … has gone"],
    answer: "has been … went",
    marker: "in 2019",
  },
  {
    id: "q9", level: 3, format: "explain", rule: "past",
    prompt: "Why is this sentence wrong? “I have met the principal yesterday.”",
    answer: "“Yesterday” is a finished time, so English needs the simple past: I met the principal yesterday.",
    marker: "yesterday",
  },
];

// Diagnostic items shown on the welcome screen (one per misconception).
export const DIAGNOSTIC = ["q1", "q2"];

export function byId(id) {
  return BANK.find((q) => q.id === id);
}
