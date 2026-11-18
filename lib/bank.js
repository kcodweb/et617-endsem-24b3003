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
  {
    // Two clauses: one present perfect, one simple past. parts[] gives the time word for each blank.
    id: "q10", level: 3, format: "fill", rule: "perfect",
    prompt: "I ___ (know) Amit since Class 3, and we ___ (meet) first at a cricket match.",
    answer: "have known … met",
    accept: ["have known met", "have known and met", "'ve known … met"],
    marker: "since Class 3",
    parts: [{ marker: "since Class 3" }, { marker: "first at a cricket match" }],
  },
  {
    // has gone (still away, connected to now) vs has been (went and came back).
    id: "q11", level: 3, format: "mcq", rule: "perfect",
    prompt: "Papa ___ to Delhi. He will come back on Sunday.",
    options: ["has gone", "has been", "went"],
    answer: "has gone",
    marker: "will come back on Sunday",
  },
  {
    // A When-question asks for a finished point in time -> simple past.
    id: "q12", level: 3, format: "fill", rule: "past",
    prompt: "When ___ you ___ (reach) Patna?",
    answer: "did … reach",
    accept: ["did reach"],
    marker: "When",
  },
  {
    // Short diary with two errors (M1 in the first sentence, M2 in the second).
    id: "q13", level: 3, format: "fix", rule: "past",
    prompt: "Yesterday I have gone to the market. I am living in Patna since 2019.",
    answer: "Yesterday I went to the market. I have lived in Patna since 2019.",
    accept: ["yesterday i went to the market i've lived in patna since 2019"],
    marker: "Yesterday",
    parts: [{ marker: "Yesterday" }, { marker: "since 2019" }],
  },
];

// Diagnostic items shown on the welcome screen (one per misconception).
export const DIAGNOSTIC = ["q1", "q2"];

export function byId(id) {
  return BANK.find((q) => q.id === id);
}
