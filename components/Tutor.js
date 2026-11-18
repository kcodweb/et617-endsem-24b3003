"use client";
import { useEffect, useState } from "react";
import { BANK, byId } from "@/lib/bank";
import { classifyDetail, decide, nextLevel, FEEDBACK, HINT } from "@/lib/engine";
import { ruleCheck, explainFeedback } from "@/lib/rules";

const ROLL = "24B3003";
const SESSION_LENGTH = 8;
const STORE = "kya-v1";
// Demo mode (?demo=1): no AI calls, fixed seed order, separate log so it never mixes with real learner data.
const DEMO_STORE = "kya-demo-v1";
const DEMO_ORDER = ["q1", "q2", "q6", "q4", "q3", "q7", "q5", "q9"];

// ---------- small UI pieces ----------
// C3: the whole app (header, main, footer) is one 360px phone-width column. On wider screens it gets a
// border and shadow on a neutral background, so it looks like a phone on a laptop too.
function Shell({ children, onAbout, step }) {
  return (
    <div className="phone w-full max-w-[360px] mx-auto min-h-dvh flex flex-col bg-amber-50 text-slate-900">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-amber-200">
        <span className="font-bold text-lg">Kal ya Abhi?</span>
        {step && <span className="text-sm text-slate-600">{step}</span>}
      </header>
      <main className="flex-1 flex flex-col w-full px-4 py-4">{children}</main>
      <footer className="flex items-center justify-center text-xs text-slate-600 border-t border-amber-200 bg-white">
        <span>ET 617 · ID {ROLL} ·</span>
        <button onClick={onAbout} className="min-h-[48px] px-4 underline active:bg-amber-100">About</button>
      </footer>
    </div>
  );
}

// Bottom "thumb zone" action area (C3: key actions within thumb reach).
function Actions({ children }) {
  return <div className="mt-auto pt-4 flex flex-col gap-3">{children}</div>;
}

// When the keyboard opens, scroll so the Check button (just below the input) is in view.
function keepCheckVisible() {
  setTimeout(() => document.getElementById("check-btn")?.scrollIntoView({ block: "end", behavior: "smooth" }), 300);
}

function Big({ children, onClick, kind = "primary", disabled, id }) {
  const styles = {
    primary: "bg-indigo-700 text-white active:bg-indigo-800",
    option: "bg-white border-2 border-indigo-300 text-slate-900 active:bg-indigo-50",
    ghost: "bg-transparent text-indigo-800 underline active:bg-indigo-50",
    secondary: "bg-white border-2 border-amber-400 text-slate-900 active:bg-amber-100",
  };
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      className={`w-full min-h-[52px] rounded-xl px-4 text-lg font-semibold disabled:opacity-40 active:scale-[0.98] ${styles[kind]}`}
    >
      {children}
    </button>
  );
}

function Timeline({ rule }) {
  // Finished box (simple past) vs line reaching NOW (present perfect).
  return (
    <svg viewBox="0 0 320 90" className="w-full my-3" role="img"
      aria-label={rule === "past" ? "A dot inside a finished time box, before now" : "A line from the past reaching now"}>
      <line x1="10" y1="50" x2="300" y2="50" stroke="#334155" strokeWidth="2" />
      <text x="282" y="80" fontSize="13" fill="#334155">NOW</text>
      <line x1="290" y1="38" x2="290" y2="62" stroke="#b91c1c" strokeWidth="3" />
      {rule === "past" ? (
        <>
          <rect x="60" y="28" width="110" height="44" rx="6" fill="#fde68a" stroke="#b45309" />
          <circle cx="115" cy="50" r="7" fill="#b45309" />
          <text x="62" y="20" fontSize="13" fill="#92400e">finished time (yesterday)</text>
        </>
      ) : (
        <>
          <line x1="80" y1="50" x2="288" y2="50" stroke="#4338ca" strokeWidth="8" strokeLinecap="round" />
          <circle cx="80" cy="50" r="7" fill="#4338ca" />
          <text x="70" y="20" fontSize="13" fill="#3730a3">since 2020 → still true now</text>
        </>
      )}
    </svg>
  );
}

// ---------- the tutor ----------
export default function Tutor() {
  const [screen, setScreen] = useState("welcome");
  const [card, setCard] = useState(0); // concept card index
  const [level, setLevel] = useState(1);
  const [q, setQ] = useState(null);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null); // {verdict, feedback, action, source}
  const [loading, setLoading] = useState(false);
  const [prevScreen, setPrevScreen] = useState("welcome");
  const [sorted, setSorted] = useState({}); // prerequisite mini-lesson answers
  // Interaction data for adaptivity: was the hint used, and when was the question shown?
  const [hintUsed, setHintUsed] = useState(false);
  const [shownAt, setShownAt] = useState(0);

  // Start the clock and reset the hint each time a new question appears on screen.
  useEffect(() => {
    if (screen === "practice" && q && !loading) { setShownAt(Date.now()); setHintUsed(false); }
  }, [q, screen, loading]);

  // Learner profile: language preference (home language Hindi vs school medium English) + a log of changes.
  const [hindi, setHindi] = useState(false);
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [demo, setDemo] = useState(false);
  const storeKey = demo ? DEMO_STORE : STORE;

  // Read demo mode from the URL, then restore saved history and profile (they survive a page reload).
  useEffect(() => {
    const isDemo = new URLSearchParams(window.location.search).get("demo") === "1";
    setDemo(isDemo);
    try {
      const s = JSON.parse(localStorage.getItem(isDemo ? DEMO_STORE : STORE) || "null");
      if (s?.history) setHistory(s.history);
      if (s?.profile?.hindi) setHindi(true);
      if (s?.events) setEvents(s.events);
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return; // don't overwrite saved data before it is restored
    try { localStorage.setItem(storeKey, JSON.stringify({ history, profile: { hindi }, events })); } catch {}
  }, [history, hindi, events, loaded, storeKey]);

  function toggleHindi() {
    const value = !hindi;
    setHindi(value);
    setEvents((e) => [...e, { type: "language", value: value ? "hi" : "en", qid: q?.id, t: Date.now() }]);
  }

  const session = history.filter((h) => h.session === "current");
  const used = session.map((h) => h.qid);

  function about() { setPrevScreen(screen); setScreen("about"); }

  function start() {
    if (demo) {
      // Demo: start from a clean demo log every time, so the walkthrough is reproducible.
      setHistory([]); setEvents([]); setHindi(false);
    } else {
      setHistory((h) => h.map((x) => ({ ...x, session: "old" })));
    }
    setLevel(1);
    setCard(0);
    setScreen("concept");
  }

  // Get the next question: seed items first, explain items on every 3rd turn, otherwise ask the AI.
  async function loadQuestion(lvl, lastVerdict) {
    setInput("");
    setResult(null);
    const n = session.length;
    if (demo) { setQ(byId(DEMO_ORDER[n] || DEMO_ORDER[DEMO_ORDER.length - 1])); setScreen("practice"); return; }
    if (n === 0) { setQ(byId("q1")); setScreen("practice"); return; }
    if (n === 1) { setQ(byId("q2")); setScreen("practice"); return; }
    if (n % 3 === 2) {
      const ex = BANK.find((b) => b.format === "explain" && !used.includes(b.id));
      if (ex) { setQ(ex); setScreen("practice"); return; }
    }
    const rule = lastVerdict === "M1" ? "past" : lastVerdict === "M2" || lastVerdict === "M3" ? "perfect" : n % 2 ? "perfect" : "past";
    setLoading(true);
    setScreen("practice");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          level: lvl, rule, lastMisconception: ["M1", "M2", "M3"].includes(lastVerdict) ? lastVerdict : null,
          usedIds: used, recent: session.map((h) => h.prompt),
        }),
      });
      setQ(await res.json());
    } catch {
      setQ(BANK.find((b) => b.level === lvl && !used.includes(b.id)) || BANK[0]);
    }
    setLoading(false);
  }

  function showHint() {
    if (hintUsed) return;
    setHintUsed(true);
    setEvents((e) => [...e, { type: "hint", qid: q.id, t: Date.now() }]);
  }

  async function check(answer) {
    const timeTakenMs = Date.now() - shownAt; // measured at submit, before any AI call
    let verdict, feedback, source = "rule";
    let fq = q; // the item as used for feedback (with the time word of the part the learner got wrong)
    if (q.format === "explain" && demo) {
      verdict = ruleCheck(answer, q.marker);
      feedback = explainFeedback(verdict, q.marker, q.answer);
    } else if (q.format === "explain") {
      setLoading(true);
      try {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: q.prompt, modelAnswer: q.answer, marker: q.marker, response: answer }),
        });
        const out = await res.json();
        verdict = out.verdict; feedback = out.feedback; source = out.source;
      } catch {
        verdict = "other"; feedback = FEEDBACK.other.en(q); source = "offline";
      }
      setLoading(false);
    } else {
      const d = classifyDetail(q, answer);
      verdict = d.verdict;
      fq = { ...q, marker: d.marker };
      feedback = FEEDBACK[verdict].en(fq);
    }
    const entry = { session: "current", qid: q.id, prompt: q.prompt, rule: q.rule, level, format: q.format,
      response: answer, verdict, lang: hindi ? "hi" : "en", hintUsed, timeTakenMs, t: Date.now() };
    const newSession = [...session, entry];
    const action = decide(verdict, newSession, { hintUsed, timeTakenMs });
    entry.action = action;
    setHistory((h) => [...h, entry]);
    setResult({ verdict, feedback, action, source, fq });
    setScreen("feedback");
  }

  function next() {
    const newLevel = nextLevel(level, result.action);
    setLevel(newLevel);
    if (session.length >= SESSION_LENGTH) { setScreen("summary"); return; }
    if (result.action === "alternative") { setScreen("alternative"); return; }
    if (result.action === "prerequisite") { setSorted({}); setScreen("prerequisite"); return; }
    loadQuestion(newLevel, result.verdict);
  }

  const last = session[session.length - 1];
  const step = ["practice", "feedback"].includes(screen) ? `Q ${Math.min(session.length + (screen === "practice" ? 1 : 0), SESSION_LENGTH)}/${SESSION_LENGTH} · Level ${level}` : "";

  // ---------- screens ----------
  if (screen === "about") return (
    <Shell onAbout={about}>
      <h1 className="text-2xl font-bold mb-2">About</h1>
      <p className="mb-2"><b>ID:</b> {ROLL}</p>
      <p className="mb-2"><b>Card:</b> P4 Adaptive tutor · T7 English tenses (simple past vs present perfect) · L8 home language differs from school medium (Ravi, 13: Hindi at home, English-medium CBSE school in Patna) · C3 mobile-first, one-handed</p>
      <p className="mb-2">Explanations in Hindi because it is Ravi's home language; the questions are in English, his school medium.</p>
      <p className="mb-2"><b>How it adapts:</b></p>
      <ul className="mb-2 list-disc pl-5 text-base">
        <li>correct, no hint, within 45 s → harder question (level +1)</li>
        <li>correct but hint used or more than 45 s → one more at the same level</li>
        <li>first mix-up (M1/M2/M3) or another error → timeline explanation + a similar question</li>
        <li>the same mix-up twice → mini-lesson on time words, then one level easier</li>
      </ul>
      <p className="mb-2"><b>AI:</b> Claude generates new questions and checks your “explain why” answers. Every AI question is checked by rules before you see it. If the AI is slow or fails, an “Offline question” from the teacher-written bank is shown instead.</p>
      <p className="mb-2"><b>Demo mode:</b> open the app with <code>?demo=1</code> (et617-24b3003.vercel.app/?demo=1) for a reproducible walkthrough: fixed teacher-written questions in a set order, no AI calls, and a separate log.</p>
      {demo && <p className="mb-2 text-sm text-slate-500">Demo mode · seed questions</p>}
      <p className="mb-2 text-sm text-slate-600">Answers logged on this phone: {history.length}</p>
      <Actions><Big onClick={() => setScreen(prevScreen === "about" ? "welcome" : prevScreen)}>Back</Big></Actions>
    </Shell>
  );

  if (screen === "welcome") return (
    <Shell onAbout={about}>
      <h1 className="text-3xl font-bold mt-4">Kal ya Abhi?</h1>
      <p className="text-lg mt-2">Yesterday or now? Learn when to say <b>“I went”</b> and when to say <b>“I have gone”</b>.</p>
      <ul className="mt-4 space-y-2 text-base">
        <li>⏱ About 15 minutes · {SESSION_LENGTH} questions</li>
        <li>👍 Use one thumb — all buttons are at the bottom</li>
        <li>🧭 The questions change based on your answers</li>
      </ul>
      <Actions><Big onClick={start}>Start</Big></Actions>
    </Shell>
  );

  if (screen === "concept") {
    const cards = [
      { rule: "past", title: "1. Finished time → simple past",
        body: <>If the sentence says <b>WHEN</b> and that time is over — <i>yesterday, last week, in 2019, two days ago</i> — use the past: <b>I went</b>, <b>She bought</b>.</>,
        hindi: "Hindi mein “main kal gaya hoon” chalta hai, par English mein “yesterday” ke saath “have gone” nahi aata." },
      { rule: "perfect", title: "2. Connected to now → present perfect",
        body: <>If the action is linked to <b>NOW</b> — <i>since, for, ever, never, already, just, yet</i> — use <b>have/has + V3</b>: <b>I have lived here since 2020</b>.</>,
        hindi: "“Since 2020” ka matlab: 2020 se ab tak. Isliye “am living” nahi, “have lived”." },
    ];
    const c = cards[card];
    return (
      <Shell onAbout={about} step={`Idea ${card + 1}/2`}>
        <h2 className="text-2xl font-bold">{c.title}</h2>
        <Timeline rule={c.rule} />
        <p className="text-lg">{c.body}</p>
        <p className="mt-3 p-3 rounded-lg bg-white border border-amber-300 text-base">🗣 {c.hindi}</p>
        <Actions>
          {card === 0
            ? <Big onClick={() => setCard(1)}>Next idea</Big>
            : <Big onClick={() => loadQuestion(1, null)}>Start practice</Big>}
        </Actions>
      </Shell>
    );
  }

  if (screen === "practice") {
    if (loading || !q) return (
      <Shell onAbout={about} step={step}><p className="text-lg mt-8 text-center">Making your next question…</p></Shell>
    );
    const label = { mcq: "Choose the correct option", fill: "Fill in the blank", fix: "Find and fix the mistake", explain: "Explain in your own words" }[q.format];
    return (
      <Shell onAbout={about} step={step}>
        <p className="text-sm font-semibold text-indigo-800 uppercase">{label}</p>
        {demo && <p className="text-xs text-slate-500">Demo mode · seed questions</p>}
        <p className="text-xs text-slate-600 mb-2">{q.source === "ai" ? "AI-generated question" : q.source === "offline" ? "Offline question (AI unavailable)" : "Teacher-written question"}</p>
        <p className="text-2xl font-medium leading-snug">{q.prompt}</p>
        {hintUsed && (
          <p className="mt-3 p-3 rounded-lg bg-yellow-50 border border-yellow-400 text-lg" lang={hindi ? "hi-Latn" : "en"}>
            💡 {hindi ? HINT.hi(q) : HINT.en(q)}
          </p>
        )}
        <Actions>
          <Big kind="secondary" onClick={showHint} disabled={hintUsed}>{hintUsed ? "💡 Hint shown" : "💡 Hint"}</Big>
          {q.format === "mcq" ? (
            q.options.map((o) => <Big key={o} kind="option" onClick={() => check(o)}>{o}</Big>)
          ) : (
            <>
              {/* Input and Check sit together in normal flow (no fixed positioning), so when the on-screen
                  keyboard opens the page resizes and the Check button stays directly under the input. */}
              {q.format === "explain"
                ? <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} onFocus={keepCheckVisible}
                    placeholder="Because…" className="w-full rounded-xl border-2 border-indigo-300 p-3 text-lg" />
                : <input value={input} onChange={(e) => setInput(e.target.value)} autoCapitalize="none" onFocus={keepCheckVisible}
                    enterKeyHint="done" onKeyDown={(e) => e.key === "Enter" && input.trim() && check(input)}
                    placeholder={q.format === "fill" ? "Type the verb, e.g. went" : "Type the correct sentence"}
                    className="w-full min-h-[52px] rounded-xl border-2 border-indigo-300 px-3 text-lg" />}
              <Big id="check-btn" onClick={() => check(input)} disabled={!input.trim()}>Check</Big>
            </>
          )}
        </Actions>
      </Shell>
    );
  }

  if (screen === "feedback") {
    const good = result.verdict === "correct";
    const nextText = { harder: "Next: a harder question ⬆", same: "Next: one more at this level", alternative: "Next: see it on a timeline", prerequisite: "Next: a short lesson on time words" }[result.action];
    const tag = { correct: "Correct", M1: "Common mix-up: “have + V3” with a finished time", M2: "Common mix-up: “am …ing” with since/for", M3: "Common mix-up: “did” with ever/already/just", other: "Not quite" }[result.verdict];
    return (
      <Shell onAbout={about} step={step}>
        <div className={`rounded-xl p-4 border-2 ${good ? "bg-green-50 border-green-600" : "bg-orange-50 border-orange-500"}`}>
          <p className="text-xl font-bold">{good ? "✓ " : "↺ "}{tag}</p>
          <p className="mt-2 text-sm text-slate-700">Your answer: “{last?.response}”</p>
          <p className="mt-3 text-lg" lang={hindi ? "hi-Latn" : "en"}>{hindi ? FEEDBACK[result.verdict].hi(result.fq) : result.feedback}</p>
          {hindi
            ? <p className="mt-2 text-xs text-slate-600">Hindi explanation (teacher-written)</p>
            : result.source !== "rule" && <p className="mt-2 text-xs text-slate-600">{result.source === "ai" ? "Feedback by AI tutor" : "Offline feedback (AI unavailable)"}</p>}
        </div>
        <Actions>
          <button role="switch" aria-checked={hindi} onClick={toggleHindi}
            className="w-full min-h-[52px] rounded-xl border-2 border-amber-400 bg-white active:bg-amber-100 px-4 flex items-center justify-between text-lg font-semibold">
            <span>🗣 Hindi mein samjhao</span>
            <span className={`w-12 h-7 rounded-full p-1 transition ${hindi ? "bg-green-600" : "bg-slate-300"}`}>
              <span className={`block w-5 h-5 rounded-full bg-white transition ${hindi ? "translate-x-5" : ""}`} />
            </span>
          </button>
          <Big onClick={next}>{session.length >= SESSION_LENGTH ? "See my progress" : nextText}</Big>
        </Actions>
      </Shell>
    );
  }

  if (screen === "alternative") {
    const rule = last?.rule || "past";
    return (
      <Shell onAbout={about} step="Another way to see it">
        <h2 className="text-2xl font-bold">{rule === "past" ? "Is the time finished?" : "Does it reach NOW?"}</h2>
        <Timeline rule={rule} />
        <p className="text-lg">
          {rule === "past"
            ? <>Ask: <b>“Can I point to WHEN on the calendar, and is it over?”</b> If yes → <b>simple past</b> (went, saw, bought).</>
            : <>Ask: <b>“Is it still true or important now?”</b> If yes → <b>have/has + V3</b> (have lived, has left).</>}
        </p>
        <p className="mt-3 p-3 rounded-lg bg-white border border-amber-300">Your sentence: “{last?.prompt}”</p>
        <Actions><Big onClick={() => loadQuestion(level, last?.verdict)}>Try a similar question</Big></Actions>
      </Shell>
    );
  }

  if (screen === "prerequisite") {
    const words = [
      ["yesterday", "past"], ["since 2020", "perfect"], ["last year", "past"],
      ["already", "perfect"], ["two days ago", "past"], ["ever", "perfect"],
    ];
    const done = words.every(([w]) => sorted[w]);
    const allRight = words.every(([w, r]) => sorted[w] === r);
    return (
      <Shell onAbout={about} step="Mini-lesson: time words">
        <h2 className="text-xl font-bold">You made the same mix-up twice. Let’s fix the root: time words.</h2>
        <p className="mt-1 text-base">Tap where each word belongs.</p>
        <div className="mt-3 space-y-2">
          {words.map(([w, r]) => {
            const pick = sorted[w];
            return (
              <div key={w} className="rounded-lg bg-white border border-amber-300 p-2">
                <p className="font-semibold">{w} {pick && (pick === r ? "✓" : "✗ try again")}</p>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setSorted({ ...sorted, [w]: "past" })}
                    className={`flex-1 min-h-[48px] rounded-lg border-2 active:bg-amber-100 ${pick === "past" ? "bg-amber-200 border-amber-600" : "border-amber-300"}`}>Finished</button>
                  <button onClick={() => setSorted({ ...sorted, [w]: "perfect" })}
                    className={`flex-1 min-h-[48px] rounded-lg border-2 active:bg-indigo-100 ${pick === "perfect" ? "bg-indigo-200 border-indigo-600" : "border-indigo-300"}`}>Connected to now</button>
                </div>
              </div>
            );
          })}
        </div>
        {done && allRight && <p className="mt-3 text-green-800 font-semibold">Great! Finished → went. Connected to now → have gone.</p>}
        <Actions><Big disabled={!(done && allRight)} onClick={() => loadQuestion(level, last?.verdict)}>Back to practice (easier level)</Big></Actions>
      </Shell>
    );
  }

  if (screen === "summary") {
    const correct = session.filter((h) => h.verdict === "correct").length;
    const m1 = session.filter((h) => h.verdict === "M1").length;
    const m2 = session.filter((h) => h.verdict === "M2").length;
    const m3 = session.filter((h) => h.verdict === "M3").length;
    const pct = (rule) => {
      const s = session.filter((h) => h.rule === rule);
      return s.length ? Math.round((100 * s.filter((h) => h.verdict === "correct").length) / s.length) : 0;
    };
    return (
      <Shell onAbout={about} step="Your progress">
        <h2 className="text-2xl font-bold">Well done, you finished!</h2>
        <p className="text-lg mt-2">{correct} of {session.length} correct · reached level {level}</p>
        {[["Finished time → simple past", pct("past")], ["Connected to now → present perfect", pct("perfect")]].map(([t, p]) => (
          <div key={t} className="mt-3">
            <p className="text-base">{t}: {p}%</p>
            <div className="h-3 rounded bg-slate-200"><div className="h-3 rounded bg-indigo-700" style={{ width: `${p}%` }} /></div>
          </div>
        ))}
        <p className="mt-4 text-base">
          {m1 > 0 && <>You used “have + V3” with a finished time {m1}×. </>}
          {m2 > 0 && <>You used “am …ing” with since/for {m2}×. </>}
          {m3 > 0 && <>You used “did” with ever/already/just {m3}×. </>}
          {m1 + m2 + m3 === 0 && <>No common mix-ups this time — great!</>}
        </p>
        <Actions><Big onClick={start}>Practise again</Big></Actions>
      </Shell>
    );
  }
  return null;
}
