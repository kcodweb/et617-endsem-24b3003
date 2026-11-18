# ET 617 End-Sem Report — 24B3003

## Identity card
| Field | Choice |
|---|---|
| ID | **24B3003** |
| P | **P4 – Adaptive tutor with automatic question generation** |
| T | **P4-T7 – English tenses: simple past vs present perfect (ESL)** |
| L | **L8 – Learner whose home language differs from the school medium** (Bhojpuri at home, Hindi-medium school) |
| C | **C3 – Mobile-first, one-handed** |

- Live app: https://et617-24b3003.vercel.app
- Repo: https://github.com/kcodweb/et617-endsem-24b3003
- Starter template: `create-next-app` (Next.js 15, Tailwind CSS 4). No UI library. AI: Anthropic Claude (`claude-haiku-5-5`).

---

## D1 – Educational problem
Ravi studies English as a subject in a Hindi-medium school but speaks Bhojpuri at home. When he writes in English he
translates from Hindi/Bhojpuri, where *"main kal gaya hoon"* freely puts a perfect-looking form with a finished-time
word, and *"main 2020 se yahaan reh raha hoon"* uses a continuous form with "since". So he writes *"I have gone to
the market yesterday"* and *"I am living here since 2020"*. Textbook exercises mark him wrong but never say which
rule he broke, so the same error comes back. He needs a short phone tutor that notices *his* error pattern and
changes the next task accordingly.

**Learning outcomes** — the learner will be able to:
1. **Classify** a time expression (*yesterday, last year, two days ago* vs *since, for, ever, already, just*) as
   "finished time" or "connected to now" (target: 6/6 in the time-word sort).
2. **Choose and produce** the correct form (simple past *went* vs present perfect *have gone*) in a sentence
   (target: ≥ 4 of 5 mixed items correct).
3. **Explain** in one sentence why a tense is correct by referring to the time marker or the "connected to now" meaning
   (target: explanation scores 2 on the rubric in D8).

**Context of use:** at home after dinner, about 15–20 minutes, on his father's budget Android phone (360 px), one hand free.

## D2 – Learner persona
- **Name / age:** Ravi Kumar, 13, Class 8, Hindi-medium government school, small town near Ara, Bihar.
- **Languages:** Bhojpuri at home; Hindi at school; English as a subject since Class 3.
- **Prior knowledge:** knows the verb table (go / went / gone, see / saw / seen); can form the simple present and the
  present continuous; has not understood the *meaning* difference between the simple past and the present perfect.
- **Misconception M1 – perfect with a finished time:** *"I have gone yesterday"*, transferred from "main kal gaya hoon".
  He believes "have + V3 = past".
- **Misconception M2 – continuous/present with since/for:** *"I am living here since 2020"*, transferred from
  "main 2020 se reh raha hoon" (also common in Indian English).
- **Device / time:** his father's Android phone, about 20 minutes in the evening, often holding it in one hand.
- **Motivation:** wants to score in English exams and not be laughed at when he speaks; enjoys quick wins; gives up
  when he sees red crosses with no reason.

## D3 – Educational content
**Concept explanation** (screens 2–3, each with a timeline diagram and a Hindi bridge sentence):
1. *Finished time → simple past.* "If the sentence says WHEN and that time is over (yesterday, last week, in 2019,
   two days ago), use the past: I went, she bought." Bridge: *"Hindi mein 'main kal gaya hoon' chalta hai, par English
   mein 'yesterday' ke saath 'have gone' nahi aata."*
2. *Connected to now → present perfect.* "If the action is linked to NOW (since, for, ever, never, already, just, yet),
   use have/has + V3: I have lived here since 2020." Bridge: *"'Since 2020' ka matlab: 2020 se ab tak."*

**Tasks** (teacher-written seed bank, 4 formats; the AI generates further items of the same formats):
| # | Format | Item | Model answer |
|---|---|---|---|
| Q1 | MCQ | I ___ my homework yesterday. (finished / have finished) | finished |
| Q2 | Fill in the blank | We ___ (live) in Patna since 2021. | have lived |
| Q3 | MCQ | ___ you ever ___ a tiger? (Did … see / Have … seen) | Have … seen |
| Q4 | Find and fix | I have seen that film last Sunday. | I saw that film last Sunday. |
| Q5 | Fill in the blank | My father ___ (buy) a new phone last month. | bought |
| Q6 | Find and fix | I am knowing her for five years. | I have known her for five years. |
| Q7 | Explain | Why is "She has just left the class" correct? | "Just" connects the action to now → present perfect. |
| Q9 | Explain | Why is "I have met the principal yesterday" wrong? | "Yesterday" is finished → simple past: I met. |

**Feedback text** (from `lib/engine.js`):
- **Correct:** "Sahi! 'yesterday' tells us the time, so 'finished' is right."
- **M1:** "You used have/has + V3 with 'last Sunday'. 'last Sunday' is a FINISHED time, so English uses the simple past
  here. Correct: 'I saw that film last Sunday.' (In Hindi 'kal gaya hoon' is fine, but in English 'have gone' cannot
  go with 'yesterday'.)"
- **M2:** "'since 2021' connects the past to NOW. English uses have/has + V3 here, not 'am/is …ing'. Correct: 'have lived'."

## D4 – Working application
URL: https://et617-24b3003.vercel.app · The footer on every screen shows "ET 617 · ID 24B3003 · About".

**Screen map:**
1. Welcome → 2. Idea 1 (finished time) → 3. Idea 2 (connected to now) → 4. Practice (MCQ / fill / fix / explain)
→ 5. Feedback (correct / M1 / M2 / not quite) → one of:
   - 6a. **Harder question** (back to 4, level +1)
   - 6b. **Alternative explanation:** timeline "Is the time finished?" / "Does it reach NOW?" → similar question
   - 6c. **Prerequisite mini-lesson:** sort 6 time words into Finished / Connected to now → back to 4 at level −1
→ 7. Progress summary (score, % per rule, misconception counts) · 8. About (card, decision rule, AI disclosure).

**C3 – mobile-first, one-handed, implemented visibly:**
- Laid out for 360–420 px, single column (`max-w-[420px]`), no horizontal scroll (checked at 375 px).
- Every answer option, input and Next/Check button sits in the bottom "thumb zone" (`mt-auto` action area) and is
  ≥ 52 px tall and full width.
- Tap only: no hover-only interactions, no drag; the mini-lesson uses two big tap buttons per word.

## D5 – Two contrasting learner scenarios (run on the live app)
**(a) Correct learner:** Q1 "I ___ my homework yesterday." → taps **finished** → "✓ Correct — Sahi! 'yesterday' tells
us the time, so 'finished' is right." → button "Next: a harder question ⬆" (level 1 → 2).
*[Screenshot A1: question · Screenshot A2: correct feedback]*

**(b) Learner with misconception M2:** Q2 "We ___ (live) in Patna since 2021." → types **am living** →
"↺ Common mix-up: 'am …ing' with since/for … Correct: 'have lived'." → "Next: see it on a timeline" →
timeline screen "Does it reach NOW?" → AI-generated similar item "My uncle ___ (work) in a bank since 2020." →
types **is working** → M2 again → "Next: a short lesson on time words" → mini-lesson sorting yesterday / since 2020 /
last year / already / two days ago / ever → back to practice at an easier level.
*[Screenshot B1: M2 feedback · B2: timeline · B3: second M2 · B4: mini-lesson]*

## D6 – AI functionality specification
**AI feature 1 – question generation** (`app/api/generate/route.js`)
- *What it does:* writes the next practice item for the learner's level, the target rule and the last misconception.
- *Input:* the system prompt `SYSTEM_GENERATE` (persona: Ravi, Bhojpuri/Hindi, Indian everyday contexts, JSON schema,
  rule definitions, level definitions) + the user message
  `Level: 2. Target rule: perfect. Learner's last misconception: M2. Do not repeat these sentences: [...]`.
- *Output:* JSON `{format, rule, prompt, options, answer, accept, marker}`, e.g.
  `{"format":"fill","rule":"perfect","prompt":"My uncle ___ (work) in a bank since 2020.","answer":"has worked","marker":"since 2020"}`.
- *Checks before the learner sees it (`valid()`):* the format and rule are allowed values; the time marker literally
  appears in the sentence; the tense of the answer agrees with the rule (a "past" item may not have a have/has answer,
  a "perfect" item must have one); an MCQ's options include the answer; a fill item contains "___".
- *Fallback:* on a timeout (12 s), an API error, unparseable JSON or a failed check → the next unseen teacher-written
  item at that level, labelled **"Offline question (AI unavailable)"**.

**AI feature 2 – explanation evaluation and misconception diagnosis** (`app/api/evaluate/route.js`)
- *What it does:* classifies Ravi's free-text "why" answer as correct / M1 / M2 / other and writes short feedback.
- *Input:* `SYSTEM_EVALUATE` (persona, the definitions of correct/M1/M2/other, tone rules: max 2 sentences, start with
  "Sahi!" only when correct, otherwise "Achha try!", always name the time word) + the sentence, the model answer, the
  marker and Ravi's text.
- *Output:* `{"verdict":"other","feedback":"Achha try! Look at the time word 'just': it means the action finished a
  moment ago, and its result is connected to now…"}`.
- *Checks:* the verdict must be one of the 4 labels; feedback longer than 300 characters is trimmed; empty answers are
  handled by a rule before any AI call.
- *Fallback:* a rule-based classifier (regex for "is/am …ing" → M2, "have … means past" → M1, mentions the marker →
  correct) with teacher-written feedback, labelled **"Offline feedback (AI unavailable)"**.
- *The verdict drives adaptivity:* an AI-detected M1/M2 counts toward the "same misconception twice" rule.

The API key is stored only as a Vercel environment variable (`ANTHROPIC_API_KEY`) and is never sent to the browser.

## D7 – Pedagogical rationale
- **Adaptive decision rule (the design challenge):**
  - **correct → harder question** (level +1: longer sentences, mixed markers, two clauses);
  - **first M1/M2, or another error → alternative explanation:** the same rule shown again in a different
    representation (a timeline plus a single self-question: "Is the time finished?" / "Does it reach NOW?"), then a
    similar item at the same level;
  - **the same misconception twice → prerequisite instruction:** the root skill is recognising time words, so a
    mini-lesson has the learner sort 6 time words, then practice resumes one level easier.
  Next items target the rule linked to the last misconception (M1 → past items, M2 → perfect items).
- **Misconception-specific feedback, not just right/wrong:** each error names the rule and the time word, and for M1
  explicitly contrasts it with the Hindi pattern ("kal gaya hoon"), because L8's errors come from transfer from the home
  language. The bridge sentences on the concept cards serve the same purpose.
- **Scaffolding:** concepts first (pre-training of the two ideas with timelines: Mayer's multimedia and signaling
  principles), then recognition (MCQ) → production (fill, fix) → explanation (Bloom: understand → apply → analyse).
- **Low cognitive load / C3:** one question per screen, large type, short sentences, all actions within thumb reach —
  Ravi uses a parent's phone in short evening sessions, often one-handed.
- **Affect:** "Sahi!" / "Achha try!", the "↺" symbol instead of a red cross, and a progress summary that names what to
  practise — this persona gives up after unexplained red marks.
- **AI judgement:** the AI never decides the next step on its own; it only produces a verdict from a fixed label set,
  and the decision rule is deterministic code. Every AI question is rule-checked, and the teacher-written bank is
  always available.

## D8 – Evaluation plan
| Outcome | Assessment | Success |
|---|---|---|
| LO1 classify time words | the 6-item time-word sort (logged first-try accuracy) | ≥ 5/6 on the first try |
| LO2 choose/produce the form | pre-test vs post-test, 5 mixed items each (different sentences, the same rules) | mean post − pre ≥ 2 items; ≥ 60% of learners ≥ 4/5 |
| LO3 explain | rubric on "explain" items: 0 = no reason, 1 = names the tense only, 2 = refers to the time marker / connected to now | ≥ 60% score 2 by the end of the session |

**Log data** (stored per answer in localStorage now; would be sent to a database in a real study): question id, rule,
level, format, the learner's response, the verdict (correct/M1/M2/other), the adaptive action taken, a timestamp
(→ time per item), and whether the item was AI-generated or offline. Analysis: the M1/M2 rate across the session (should
fall), how often the prerequisite branch is triggered, and the accuracy on the item after an alternative explanation.
A short think-aloud with 3–5 Class 8 learners in L8 contexts would check whether the Hindi bridge sentences help.

## AI-use log and reflection
- AI tool used: Claude Code (Claude Opus 5.5) in the Claude desktop app, for planning the card, DESIGN.md, writing the
  code, deploying and testing. **Chat export/link: [add link]**.
- In-app AI: Claude `claude-haiku-5-5` via the Anthropic API.
- **Reflection:** I chose the card and checked the persona against the L8 constraints (home language, school medium,
  device). Testing on the live app showed two real problems with the AI: (1) responses were cut off at the token limit,
  so every evaluation silently fell back to offline — fixed by raising `max_tokens` and showing the stop reason;
  (2) the offline fallback marked an "is …ing" explanation as correct — fixed by adding M1/M2 patterns to the rule
  check. I also changed the AI tone so that "Sahi!" is used only for correct answers. This is why the AI only returns a
  label from a fixed set and the decision rule stays in code.
