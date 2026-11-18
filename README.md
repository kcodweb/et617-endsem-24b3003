# Kal ya Abhi? — adaptive tense tutor (ET 617 end-sem, 24B3003)

Card: **P4** adaptive tutor · **T7** simple past vs present perfect (ESL) · **L8** home language differs from school
medium · **C3** mobile-first, one-handed. Design notes: [DESIGN.md](DESIGN.md).

- Live: https://et617-24b3003.vercel.app
- **Demo mode:** https://et617-24b3003.vercel.app/?demo=1 — fixed seed questions in the order
  q1, q2, q6, q4, q3, q7, q5, q9; no AI calls (explanations use the rule check); a separate log
  (`kya-demo-v1` in localStorage) that is cleared when you press Start. The normal decision rule still runs, so every
  branch appears for real and the same answers always give the same screens.

## Run locally
```bash
npm install
npm run dev
```
Set `ANTHROPIC_API_KEY` in `.env.local` (never committed) to use the AI features; without it the app uses the
teacher-written question bank and rule-based checks.

## Tests
```bash
node scripts/test-rules.mjs      # offline explanation checker
node scripts/test-classify.mjs   # fill/fix/MCQ grading and misconception diagnosis
```

Built from the `create-next-app` starter (Next.js 15, Tailwind CSS 4).
