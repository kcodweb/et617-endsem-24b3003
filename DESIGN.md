# DESIGN.md — ET 617 End-Sem (24B3003)

## Identity card
| Field | Choice |
|---|---|
| ID | **24B3003** |
| P | **P4 – Adaptive tutor with automatic question generation** |
| T | **P4-T7 – English tenses: simple past vs present perfect (ESL)** |
| L | **L8 – Learner whose home language differs from the school medium** |
| C | **C3 – Mobile-first, one-handed** |

App name: **"Kal ya Abhi?"** ("Yesterday or Now?") — a tense tutor.

---

## D1 – Educational problem
Ravi studies in an English-medium CBSE school in Patna, but Hindi is his home language. Every subject is taught and
examined in English, so he writes all his answers in English while thinking in Hindi and translating. Hindi freely
combines a perfect-looking form with a finished-time word ("main kal gaya hoon") and a continuous form with "since"
("main 2020 se yahaan reh raha hoon"), so he writes *"I have gone to the market yesterday"* and *"I am living here since
2020"*. Teachers mark him wrong but never tell him *which rule* he broke, so the error keeps coming back, and it costs
him marks in science and social science answers too, not only in English. He needs a short phone tutor that notices
*his* specific error pattern and adapts the next task.

**Context of use:** at home in the evening after homework, ~20 minutes, on his father's budget Android phone, held in
one hand.

**Learning outcomes** — by the end, the learner will be able to:
1. **Identify** whether a time expression (*yesterday, last year, in 2019* vs *since, for, ever, already, just, yet*)
   signals a finished time or a time connected to now.
2. **Choose and produce** the correct form (simple past *went* vs present perfect *have gone*) in a sentence,
   scoring ≥ 4/5 on mixed items.
3. **Explain**, in one sentence, why a given tense is correct, by referring to the time marker or to the
   "connected to now" meaning.

## D2 – Learner persona
- **Name / age:** Ravi Kumar, 13, Class 8, English-medium CBSE school in Patna (Bihar).
- **Home language:** Hindi (spoken with family and friends); **school medium:** English for all subjects.
- **Why this matters:** he thinks in Hindi and translates into English, so tense errors from Hindi patterns appear in
  every written answer and cost him marks in every subject, not just English.
- **Prior knowledge:** knows the verb forms (go / went / gone) from the textbook table; knows simple present and
  present continuous; has not yet understood the *meaning* difference between simple past and present perfect.
- **Misconception M1 — perfect with finished time:** uses the present perfect with a finished-time word,
  translated from "main kal gaya hoon" → *"I have gone yesterday."*
- **Misconception M2 — continuous/present for "since/for":** uses the present continuous or simple present with
  *since/for* (a common Indian-English pattern, from "main 2020 se yahaan reh raha hoon") → *"I am living here since 2020."*
- **Device / time:** father's Android phone (360 px wide), 20 minutes after dinner, often one hand free.
- **Motivation:** wants to stop losing marks for grammar in his exam answers and not be laughed at when speaking;
  likes quick wins and gets discouraged by red crosses without explanation.

## D3 – Educational content (plan)
**Concept explanation (2 cards):**
1. *Finished time → simple past.* "If the sentence says WHEN and that time is over (yesterday, last week, in 2019),
   use the past: *I went*." Timeline: a dot in a finished box.
2. *Connected to now → present perfect.* "If the action is linked to now — experience (ever/never), result (already,
   just, yet), or continuing (since/for) — use *have/has + V3*: *I have lived here since 2020*." Timeline: a line
   reaching to NOW.
   Bridge for Hindi speakers: "In Hindi, *'gaya hoon'* can go with *'kal'*. In English, *have gone* can NOT go with *yesterday*."

**Question bank (seed, ≥ 5 items, 4 formats) + AI-generated follow-ups:**
| # | Format | Item | Model answer |
|---|---|---|---|
| Q1 | MCQ | I ___ my homework yesterday. (have finished / finished) | finished |
| Q2 | Fill blank | We ___ (live) in Patna since 2021. | have lived |
| Q3 | Error fix | "I have seen that film last Sunday." | I saw that film last Sunday. |
| Q4 | MCQ | ___ you ever ___ a tiger? (Did…see / Have…seen) | Have…seen |
| Q5 | Explain | Why is "She has just left" correct? | "just" connects the action to now → present perfect |
| Q6 | Fill blank | My father ___ (buy) a new phone last month. | bought |

**Levels:** level 1 = a single clause with an obvious marker; level 2 = questions, negatives, *for* vs *since*;
level 3 = two clauses (*I have known Amit since Class 3, and we met first at a cricket match*), *has gone* vs
*has been*, When-questions, and a two-error diary fix (seed items q10–q13).

**Feedback:**
- Correct: "Sahi! *Last month* is finished time, so *bought* is right."
- M1 detected: "You used *have + V3* with *yesterday*. *Yesterday* is finished — English uses the simple past here: *I saw*."
- M2 detected: "*Since 2020* connects the past to NOW. Use *have lived*, not *am living*."

## Adaptive decision rule (design challenge)
After each answer the tutor classifies the response as `correct`, `M1`, `M2`, `M3` or `other`
(M3 = simple past "did" with ever/already/just), and also records **interaction data**: whether the 💡 Hint was used
and the time taken (`SLOW_MS` = 45 s in `lib/engine.js`). The decision rule:
- **correct, no hint, ≤ 45 s** → **harder question** (level +1).
- **correct but hint used or > 45 s** → **same level, new question** (the answer is right but not yet secure).
- **first M1/M2/M3, or another error** → **alternative explanation** (the timeline view for that rule) + a similar
  item at the same level.
- **the same misconception twice in the session** → **prerequisite instruction**: a mini-lesson on time-marker words
  (sort *yesterday / since 2020 / last year / already / two days ago / ever* into "Finished" vs "Connected to now"),
  then back to practice at level −1.

The hint names the time word without giving the answer ("Look at 'yesterday'. Is that time finished?" / "Look at
'since 2020'. Does it reach NOW?"), in Hindi when the Hindi toggle is on.

## AI use (Claude, via a Next.js API route)
1. **Question generation:** given the topic, the target rule, the difficulty and the last misconception, Claude returns
   a JSON item `{format, sentence, options, answer, targetRule}`.
2. **Explanation evaluation:** given the learner's free-text explanation, Claude returns
   `{verdict: correct|M1|M2|other, feedback}`.
- **Checks before the learner sees it:** JSON schema validation; the answer must contain a valid verb form; MCQ
  options must include the answer; a rule-based check that the time marker and the answer tense agree.
- **Fallback:** if the call fails or fails validation → serve the next item from the seed bank (labelled "offline question").

## C3 – Mobile-first, one-handed
- **360 px column:** the whole app (header, content, footer) is one column at most 360 px wide on every screen. On a
  laptop or tablet it is shown as a "phone" (border and shadow on a grey background), so C3 is visible in the demo too.
- **48 px minimum:** every tappable element is at least 48 px tall: answer options, Check/Next (52 px), the Hindi
  toggle, the Hint button, the mini-lesson "Finished / Connected to now" buttons and the footer "About" link.
- **Thumb zone:** primary actions sit in the bottom action area (pushed down with `mt-auto`), within reach of the thumb
  of the hand holding the phone.
- **Keyboard:** on fill/fix/explain items the Check button sits directly under the input in normal flow (no fixed
  positioning), the viewport resizes when the keyboard opens (`interactive-widget=resizes-content`), and Enter submits.
- **Tap only:** no hover-only interactions; buttons have visible pressed (`active:`) states.

## Screen map
The app has 5 sections in a bottom tab bar (thumb zone): **Home 🏠 · Learn 📘 · Practice ✏️ · Mistakes 📒 · Me 👤**.
The tab bar is hidden inside the practice loop (question, feedback, timeline, mini-lesson), where a header
"✕ Exit" button leads back to Home, and it is shown again on the summary. The footer with "ET 617 · ID 24B3003 · About"
is visible on every screen.

```
Home ─┬─ ▶ Start / Continue practice (saved level) ──► Practice loop
      ├─ Learn the 2 ideas ──► Learn
      ├─ Time-word game ──► Game (10 words) ──► Game score (best saved)
      └─ Practise my mistakes (N) ──► Mistakes

Learn ──► 1. Finished time → simple past · 2. Connected to now → present perfect · 3. Hindi vs English
          (each: timeline + explanation + Hindi bridge)

Practice loop (first session: idea cards 1–2 first)
  Question (MCQ / fill / fix / explain, 💡 hint) ──► Feedback (status, your answer vs correct, rule line,
  decision line, Hindi toggle) ──► harder / same level / timeline + similar item / time-word mini-lesson
  ──► … ──► Summary (score circle, per-rule bars, mix-up tags)

Mistakes ──► notebook (sentence, your answer struck through, correct answer, mix-up tag)
         ──► Practise my mistakes (≤ 5 items on the same rules: seed items first, then AI items) ──► Summary

Me ──► progress (accuracy per rule, level, sessions, best game, M1/M2/M3 counts)
    ──► settings (Hindi by default, left-handed mode, text size, reset with confirmation) ──► About
```

## New features (app sections)
- **Home:** "Namaste Ravi!", one big button that resumes practice at the saved level, today's stats (done,
  correct, level) and cards for Learn, the game and mistakes.
- **Learn → "Hindi vs English":** the two Hindi patterns behind M1 and M2, side by side with correct and wrong English
  (*kal gaya hoon → I went yesterday, not I have gone yesterday*; *2020 se reh raha hoon → I have lived here since
  2020, not I am living here since 2020*). This targets L8 (transfer from the home language) directly.
- **Mistake notebook:** every M1/M2/M3/other answer from the log; "Practise my mistakes" starts a short session on
  the same rules (retrieval practice of exactly the learner's weak spots).
- **Time-word game (LO1 assessment):** 10 time words, two big buttons "Kal (finished)" / "Abhi tak (connected to now)",
  instant ✓/✗ with a one-line reason, score and saved best score; each game is logged with every pick.
- **Me → settings:** Hindi explanations by default; **left-handed mode** (the answer area and the hint button move
  to the left, so C3 one-handed use works for either hand); Normal/Large text for the question and feedback;
  reset progress with an on-screen confirmation. Settings are saved in the profile and each change is logged.

## Evaluation plan (outline)
- Pre-test vs post-test (5 items each, the same rules, different sentences); success = ≥ 60% of learners reach ≥ 4/5.
- LO1: the time-word game score (logged per game, with every pick); success = ≥ 8/10.
- Logged events: answer, classification, time per item, hints used, adaptive branch taken, language and setting
  changes, game results.
- Rubric for explanations: 0 = no reason, 1 = names the tense, 2 = refers to the time marker / "connected to now".

## Stack
Next.js (App Router) + Tailwind on Vercel; Anthropic Claude via a server API route (key in a Vercel env var);
progress in localStorage. Starter: `create-next-app` (named in the report).

## Revision note
The persona was revised during the exam. Ravi was first written as a Bhojpuri speaker in a Hindi-medium school;
he is now a Hindi speaker in an English-medium CBSE school in Patna. The new version is a clearer fit for L8: his
home language (Hindi) differs from his school medium (English), and because English is used in every subject, his
tense errors cost him marks across all subjects. It also makes the Hindi bridge lines and the Hindi feedback a direct
match for his home language. The two misconceptions (M1, M2) did not change, because both come from Hindi patterns.
