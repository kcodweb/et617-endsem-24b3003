"use client";
import { useEffect, useState } from "react";
import { BANK, byId } from "@/lib/bank";
import { classifyDetail, decide, nextLevel, targetVerb, FEEDBACK, HINT, UI_TEXT, LESSON_BUTTONS } from "@/lib/engine";
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
function Shell({ children, onAbout, step, prog, screenKey, tab, onTab, onExit, settings = {} }) {
  return (
    <div className="phone w-full max-w-[360px] mx-auto min-h-dvh flex flex-col bg-amber-50 text-slate-900"
      data-size={settings.textSize || "normal"} data-hand={settings.leftHanded ? "left" : "right"}>
      <header className="bg-white border-b border-amber-200">
        <div className="flex items-center justify-between px-4 py-1 min-h-[52px]">
          <span className="font-bold text-lg">Kal ya Abhi?</span>
          <span className="flex items-center gap-1">
            {step && <span className="text-sm text-slate-600">{step}</span>}
            {/* With the tab bar hidden during a question, this is the way back to Home. */}
            {!tab && onExit && (
              <button onClick={onExit} aria-label="Exit practice" className="min-h-[48px] min-w-[48px] px-2 rounded-lg text-slate-700 font-semibold active:bg-slate-100">✕ Exit</button>
            )}
          </span>
        </div>
        {prog && <Progress {...prog} />}
      </header>
      {/* key = screen: a new screen remounts <main>, which plays the short CSS fade/slide-in. */}
      <main key={screenKey} className="screen-in flex-1 flex flex-col w-full px-4 py-4">{children}</main>
      {/* Bottom block stays in view: the tab bar (thumb zone, hidden during a question) + the identity footer. */}
      <div className="sticky bottom-0 z-10">
        {tab && <TabBar active={tab} onTab={onTab} />}
        <footer className="flex items-center justify-center text-sm text-slate-600 border-t border-amber-200 bg-white">
          <span>ET 617 · ID {ROLL} ·</span>
          <button onClick={onAbout} className="min-h-[48px] px-4 underline active:bg-amber-100">About</button>
        </footer>
      </div>
    </div>
  );
}

const TABS = [
  ["home", "🏠", "Home"], ["learn", "📘", "Learn"], ["practice", "✏️", "Practice"], ["mistakes", "📒", "Mistakes"], ["me", "👤", "Me"],
];

function TabBar({ active, onTab }) {
  return (
    <nav className="grid grid-cols-5 bg-white border-t border-slate-200" aria-label="Sections">
      {TABS.map(([id, icon, label]) => (
        <button key={id} onClick={() => onTab(id)} aria-current={active === id ? "page" : undefined}
          className={`min-h-[56px] flex flex-col items-center justify-center gap-0.5 text-[13px] active:bg-indigo-100 ${
            active === id ? "text-indigo-800 font-bold bg-indigo-50 shadow-[inset_0_3px_0_#4338ca]" : "text-slate-700"}`}>
          <span className="text-xl leading-none" aria-hidden="true">{icon}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}

// 8 segments, one per question: green = correct, orange = mix-up / not quite, grey = not done yet.
function Progress({ verdicts, total, level }) {
  return (
    <div className="flex items-center gap-2 px-4 pb-3">
      <div className="flex-1 flex gap-1" role="img" aria-label={`${verdicts.length} of ${total} questions done`}>
        {Array.from({ length: total }, (_, i) => {
          const v = verdicts[i];
          const c = v === undefined ? "bg-slate-200" : v === "correct" ? "bg-green-600" : "bg-orange-500";
          return <span key={i} className={`h-2.5 flex-1 rounded-full ${c}`} />;
        })}
      </div>
      <span className="shrink-0 rounded-full bg-indigo-700 text-white text-sm font-semibold px-2 py-0.5">Level {level}</span>
    </div>
  );
}

// Bottom "thumb zone" action area (C3: key actions within thumb reach).
function Actions({ children }) {
  return <div className="actions mt-auto pt-4 flex flex-col gap-3">{children}</div>;
}

// One grey line on the feedback screen that explains why the tutor chose the next step (makes the rule visible).
function decisionLine({ action, hintUsed, timeTakenMs, verdict }, demo, lang = "en") {
  const D = UI_TEXT[lang].decision;
  const time = D.tookSecs(Math.round(timeTakenMs / 1000), demo);
  if (action === "harder") return D.harder(time);
  if (action === "same") return hintUsed ? D.sameHint : D.sameSlow(time);
  if (action === "prerequisite") return D.prerequisite;
  return ["M1", "M2", "M3"].includes(verdict) ? D.firstMixup : D.other;
}

// The "🗣 Hindi mein samjhao" switch (feedback, timeline and mini-lesson screens): 52px, in the thumb zone.
function HindiSwitch({ on, onClick }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick}
      className="hand-row w-full min-h-[52px] rounded-xl border-2 border-amber-400 bg-white active:bg-amber-100 px-4 flex items-center justify-between text-base font-semibold">
      <span>🗣 Hindi mein samjhao</span>
      <span className={`w-12 h-7 rounded-full p-1 transition ${on ? "bg-green-600" : "bg-slate-300"}`}>
        <span className={`block w-5 h-5 rounded-full bg-white transition ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

// Speech input (viva change): speak the answer instead of typing it. Uses the browser's Web Speech API
// (Chrome/Edge/Android); the button is hidden where the browser has no speech recognition.
// The spoken text goes into the answer box so the learner can check or edit it before pressing Check.
function MicButton({ onText, lang = "en-IN" }) {
  const [listening, setListening] = useState(false);
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SR) return null;
  function listen() {
    const rec = new SR();
    rec.lang = lang; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => onText(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }
  return (
    <button onClick={listen} disabled={listening}
      className="w-full min-h-[52px] rounded-xl border-2 border-indigo-300 bg-white text-indigo-800 text-base font-semibold active:bg-indigo-50 disabled:bg-indigo-50">
      {listening ? "🎙 Listening… speak now" : "🎤 Speak your answer"}
    </button>
  );
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
      className={`w-full min-h-[52px] rounded-xl px-4 text-base font-semibold disabled:opacity-40 active:scale-[0.98] ${styles[kind]}`}
    >
      {children}
    </button>
  );
}

function Timeline({ rule, marker }) { // marker: the question's time word (defaults for the idea cards)
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
          <text x="160" y="20" textAnchor="middle" fontSize="13" fill="#92400e">finished time ({marker || "yesterday"})</text>
        </>
      ) : (
        <>
          <line x1="80" y1="50" x2="288" y2="50" stroke="#4338ca" strokeWidth="8" strokeLinecap="round" />
          <circle cx="80" cy="50" r="7" fill="#4338ca" />
          <text x="160" y="20" textAnchor="middle" fontSize="13" fill="#3730a3">{marker || "since 2020"} → still true now</text>
        </>
      )}
    </svg>
  );
}

// Welcome screen: the two ideas side by side as tiny timelines.
function MiniTimelines() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2" aria-hidden="true">
      <div className="rounded-xl bg-white border border-amber-300 p-2">
        <svg viewBox="0 0 140 44" className="w-full">
          <line x1="4" y1="26" x2="134" y2="26" stroke="#334155" strokeWidth="2" />
          <line x1="130" y1="16" x2="130" y2="36" stroke="#b91c1c" strokeWidth="3" />
          <rect x="22" y="12" width="56" height="28" rx="5" fill="#fde68a" stroke="#b45309" />
          <circle cx="50" cy="26" r="5" fill="#b45309" />
        </svg>
        <p className="text-sm font-semibold text-amber-950 text-center">Kal (finished)</p>
        <p className="text-sm text-center text-slate-700">I went</p>
      </div>
      <div className="rounded-xl bg-white border border-indigo-300 p-2">
        <svg viewBox="0 0 140 44" className="w-full">
          <line x1="4" y1="26" x2="134" y2="26" stroke="#334155" strokeWidth="2" />
          <line x1="130" y1="16" x2="130" y2="36" stroke="#b91c1c" strokeWidth="3" />
          <line x1="34" y1="26" x2="128" y2="26" stroke="#4338ca" strokeWidth="7" strokeLinecap="round" />
          <circle cx="34" cy="26" r="5" fill="#4338ca" />
        </svg>
        <p className="text-sm font-semibold text-indigo-900 text-center">Abhi tak (connected to now)</p>
        <p className="text-sm text-center text-slate-700">I have gone</p>
      </div>
    </div>
  );
}

// Summary: a big score circle.
function ScoreCircle({ correct, total }) {
  const r = 52, c = 2 * Math.PI * r, f = total ? correct / total : 0;
  return (
    <svg viewBox="0 0 130 130" className="w-36 h-36 mx-auto my-3" role="img" aria-label={`${correct} of ${total} correct`}>
      <circle cx="65" cy="65" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle cx="65" cy="65" r={r} fill="none" stroke="#16a34a" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${c * f} ${c}`} transform="rotate(-90 65 65)" />
      <text x="65" y="73" textAnchor="middle" fontSize="28" fontWeight="700" fill="#0f172a">{correct}/{total}</text>
    </svg>
  );
}

// ---------- sentences with highlighted time words ----------
// Colour meaning everywhere: amber = finished time / simple past, indigo = connected to now / present perfect.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The time words of an item and the rule each one signals (multi-part items have one per blank/sentence).
function markersOf(q) {
  if (q.parts) return targetVerb(q).map((p) => ({ marker: p.marker, rule: p.rule }));
  return [{ marker: q.marker, rule: q.rule }];
}

function Chip({ rule, children }) {
  return (
    <span className={`inline-block rounded-md px-1.5 font-bold ${rule === "past" ? "bg-amber-200 text-amber-950" : "bg-indigo-100 text-indigo-900"}`}>
      {children}
    </span>
  );
}

// Renders text with each time word as a chip and each ___ as a visible underlined slot
// (or, when `fills` is given, with the correct words written into the slots).
function Sentence({ text, markers = [], fills }) {
  const ms = markers.filter((m) => m.marker);
  const alts = ["___", ...ms.map((m) => escapeRe(m.marker))].join("|");
  let slot = 0;
  return (
    <>
      {text.split(new RegExp(`(${alts})`, "gi")).map((seg, i) => {
        if (seg === "___") {
          const f = fills?.[slot++];
          return f
            ? <b key={i} className="text-green-800">{f}</b>
            : <span key={i} role="img" aria-label="blank" className="inline-block w-14 mx-1 border-b-[3px] border-slate-700 align-baseline">&nbsp;</span>;
        }
        const m = ms.find((x) => x.marker.toLowerCase() === seg.toLowerCase());
        return m ? <Chip key={i} rule={m.rule}>{seg}</Chip> : <span key={i}>{seg}</span>;
      })}
    </>
  );
}

// The full correct sentence: blanks filled with the answer (fill/mcq), or the corrected sentence (fix).
function CorrectSentence({ q }) {
  if (q.format === "explain") return null;
  if (q.format === "fix") return <Sentence text={q.answer} markers={markersOf(q)} />;
  if (!q.prompt.includes("___")) return null;
  const text = q.prompt.replace(/\s*\(\w+\)/g, ""); // drop the "(live)" base-verb cue
  return <Sentence text={text} markers={markersOf(q)} fills={q.answer.split("…").map((s) => s.trim())} />;
}

// MCQ option with a letter badge (A, B, C), equal spacing and a pressed state.
function Option({ letter, children, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full min-h-[56px] rounded-xl border-2 border-indigo-300 bg-white px-3 flex items-center gap-3 text-left text-base font-semibold active:bg-indigo-100 active:border-indigo-600 active:scale-[0.98]">
      <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-700 text-white grid place-items-center text-base">{letter}</span>
      <span>{children}</span>
    </button>
  );
}

// ---------- Learn cards ----------
// Card 3 contrasts the two Hindi patterns that cause M1 and M2 with the correct English (L8: home language Hindi).
function Contrast({ hindi, right, wrong, rule }) {
  return (
    <div className={`rounded-xl bg-white border-2 p-3 ${rule === "past" ? "border-amber-300" : "border-indigo-300"}`}>
      <p className="text-base text-slate-700">Hindi: <i>{hindi}</i></p>
      <p className="font-semibold text-green-800">✓ {right}</p>
      <p className="text-red-700">✗ <s>{wrong}</s></p>
    </div>
  );
}

const LEARN_CARDS = [
  { rule: "past", icon: "🟧", title: "1. Finished time → simple past", sub: "yesterday, last year, in 2019, ago",
    body: <>If the sentence says <b>WHEN</b> and that time is over — <i>yesterday, last week, in 2019, two days ago</i> — use the past: <b>I went</b>, <b>She bought</b>.</>,
    hindi: "Hindi mein “main kal gaya hoon” chalta hai, par English mein “yesterday” ke saath “have gone” nahi aata." },
  { rule: "perfect", icon: "🟦", title: "2. Connected to now → present perfect", sub: "since, for, ever, already, just",
    body: <>If the action is linked to <b>NOW</b> — <i>since, for, ever, never, already, just, yet</i> — use <b>have/has + V3</b>: <b>I have lived here since 2020</b>.</>,
    hindi: "“Since 2020” ka matlab: 2020 se ab tak. Isliye “am living” nahi, “have lived”." },
  { rule: null, icon: "🔁", title: "3. Hindi vs English", sub: "Two Hindi patterns that don’t translate",
    body: (
      <div className="space-y-2">
        <Contrast rule="past" hindi="Main kal gaya hoon." right="I went yesterday." wrong="I have gone yesterday." />
        <Contrast rule="perfect" hindi="Main 2020 se yahaan reh raha hoon." right="I have lived here since 2020." wrong="I am living here since 2020." />
      </div>
    ),
    hindi: "Hindi ka pattern seedha translate mat karo. Pehle time word dekho: khatam ho gaya → simple past; ab tak → have/has + V3." },
];

// ---------- Time-word game (LO1 assessment) ----------
const GAME_WORDS = [
  ["yesterday", "past", "Yesterday is over — a finished time."],
  ["since 2020", "perfect", "From 2020 until now — it reaches NOW."],
  ["last year", "past", "Last year is over — a finished time."],
  ["already", "perfect", "The result is here now."],
  ["two days ago", "past", "“Ago” points to a finished moment."],
  ["ever", "perfect", "In your whole life up to now."],
  ["in 2019", "past", "2019 is a finished year."],
  ["for five years", "perfect", "A period that runs up to now."],
  ["just", "perfect", "A moment ago, and the result is now."],
  ["last Sunday", "past", "Last Sunday is over — a finished time."],
];

// ---------- the tutor ----------
export default function Tutor() {
  const [screen, setScreen] = useState("home");
  const [card, setCard] = useState(0); // concept card index
  const [conceptFrom, setConceptFrom] = useState("practice"); // idea cards opened from the Learn tab or before practice
  const [mode, setMode] = useState("normal"); // "normal" practice or "mistakes" practice
  const [sessionLen, setSessionLen] = useState(SESSION_LENGTH);
  const [mistakeRules, setMistakeRules] = useState([]);
  const [game, setGame] = useState({ i: 0, picks: [] }); // time-word game: current word + answers so far
  const [level, setLevel] = useState(1);
  const [q, setQ] = useState(null);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null); // {verdict, feedback, action, source}
  const [loading, setLoading] = useState(false);
  const [prevScreen, setPrevScreen] = useState("home");
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
  // The rest of the learner profile: saved level (to resume), sessions played, settings, best game score.
  const [profile, setProfile] = useState({ level: 1, sessions: 0 });
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
      if (s?.profile) { const { hindi: _h, ...rest } = s.profile; setProfile((p) => ({ ...p, ...rest })); }
      if (s?.events) setEvents(s.events);
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return; // don't overwrite saved data before it is restored
    try { localStorage.setItem(storeKey, JSON.stringify({ history, profile: { ...profile, hindi }, events })); } catch {}
  }, [history, hindi, profile, events, loaded, storeKey]);

  function toggleHindi() {
    const value = !hindi;
    setHindi(value);
    setEvents((e) => [...e, { type: "language", value: value ? "hi" : "en", qid: q?.id, t: Date.now() }]);
  }

  // Settings live in the saved profile; every change is logged.
  function setSetting(key, value) {
    setProfile((p) => ({ ...p, [key]: value }));
    setEvents((e) => [...e, { type: "setting", key, value, t: Date.now() }]);
  }
  const [confirmReset, setConfirmReset] = useState(false);
  function resetProgress() {
    // Keep the settings (language, hand, text size); clear answers, level, sessions and the game score.
    setHistory([]);
    setProfile((p) => ({ level: 1, sessions: 0, leftHanded: p.leftHanded, textSize: p.textSize }));
    setEvents([{ type: "reset", t: Date.now() }]);
    setLevel(1); setConfirmReset(false);
  }

  const session = history.filter((h) => h.session === "current");
  const used = session.map((h) => h.qid);

  function about() { setPrevScreen(screen); setScreen("about"); }

  // Start a practice session. Demo and first-ever session: level 1, the two idea cards first.
  // Returning learner: resume at the saved level and go straight to a question.
  const firstTime = history.length === 0;
  // The Practice tab always goes straight to the first question. The two idea cards (with "Skip →") are shown
  // only when practice is started from Home on the very first visit (a demo run counts as a first visit).
  function start({ fromHome = false } = {}) {
    setProfile((p) => ({ ...p, sessions: (p.sessions || 0) + 1 }));
    setMode("normal"); setSessionLen(SESSION_LENGTH);
    const showIdeas = fromHome && (demo || firstTime);
    if (demo) {
      // Demo: start from a clean demo log every time, so the walkthrough is reproducible (q1 first).
      setHistory([]); setEvents([]); setHindi(false);
    } else {
      setHistory((h) => h.map((x) => ({ ...x, session: "old" })));
    }
    const lvl = demo || firstTime ? 1 : profile.level || 1;
    setLevel(lvl);
    if (showIdeas) { setCard(0); setConceptFrom("practice"); setScreen("concept"); return; }
    loadQuestion(lvl, null, { fresh: true });
  }

  // Time-word game: 10 words, instant ✓/✗, score and best score saved; results logged (LO1 assessment).
  function startGame() { setGame({ i: 0, picks: [] }); setScreen("game"); }
  function answerGame(choice) {
    const [word, rule] = GAME_WORDS[game.i];
    const picks = [...game.picks, { word, choice, ok: choice === rule }];
    setGame({ ...game, picks });
    if (picks.length === GAME_WORDS.length) {
      const score = picks.filter((p) => p.ok).length;
      setProfile((p) => ({ ...p, bestGame: Math.max(p.bestGame ?? 0, score) }));
      setEvents((e) => [...e, { type: "game", score, picks, t: Date.now() }]);
    }
  }

  // "Practise my mistakes": a short session (up to 5 items) on the rules (past / perfect) the learner got wrong,
  // most frequent first. Same classify/decide rules as normal practice.
  const mistakes = history.filter((h) => h.verdict !== "correct");
  function startMistakes() {
    const count = {};
    mistakes.forEach((h) => { count[h.rule] = (count[h.rule] || 0) + 1; });
    const rules = Object.keys(count).sort((a, b) => count[b] - count[a]);
    if (!rules.length) return;
    setProfile((p) => ({ ...p, sessions: (p.sessions || 0) + 1 }));
    setMode("mistakes"); setMistakeRules(rules); setSessionLen(Math.min(5, Math.max(3, mistakes.length)));
    setHistory((h) => h.map((x) => ({ ...x, session: "old" })));
    const lvl = profile.level || 1;
    setLevel(lvl);
    loadQuestion(lvl, null, { fresh: true, mode: "mistakes", rules });
  }

  // Get the next question: seed items first, explain items on every 3rd turn, otherwise ask the AI.
  // opts.fresh: a new session was just started in this same click (the history update is not visible yet).
  async function loadQuestion(lvl, lastVerdict, opts = {}) {
    setInput("");
    setResult(null);
    const n = opts.fresh ? 0 : session.length;
    const used = opts.fresh ? [] : session.map((h) => h.qid);
    const everUsed = history.map((h) => h.qid);
    const m = opts.mode || mode;
    if (m === "mistakes") {
      // Rule for this item, cycling through the learner's mistake rules.
      const rules = opts.rules || mistakeRules;
      const rule = rules[n % rules.length];
      const wrongIds = mistakes.filter((h) => h.rule === rule).map((h) => h.qid);
      const seeds = BANK.filter((b) => b.rule === rule && b.format !== "explain" && !used.includes(b.id));
      // Seed items with this rule first (ones the learner got wrong before come first), then AI items.
      const seed = seeds.find((b) => wrongIds.includes(b.id)) || seeds[0];
      if (seed) { setQ(seed); setScreen("practice"); return; }
      if (demo) { setScreen("summary"); return; } // demo mode never calls the AI
      const lastMis = mistakes.filter((h) => h.rule === rule).pop()?.verdict;
      setLoading(true); setScreen("practice");
      try {
        const res = await fetch("/api/generate", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ level: lvl, rule, lastMisconception: ["M1", "M2", "M3"].includes(lastMis) ? lastMis : null,
            usedIds: used, recent: session.map((h) => h.prompt) }),
        });
        setQ(await res.json());
      } catch {
        setQ(BANK.find((b) => b.rule === rule) || BANK[0]);
      }
      setLoading(false);
      return;
    }
    if (demo) { setQ(byId(DEMO_ORDER[n] || DEMO_ORDER[DEMO_ORDER.length - 1])); setScreen("practice"); return; }
    // The first-ever session opens with the two diagnostic seed items (one per misconception).
    if (n === 0 && !everUsed.includes("q1")) { setQ(byId("q1")); setScreen("practice"); return; }
    if (n === 1 && used[0] === "q1" && !everUsed.includes("q2")) { setQ(byId("q2")); setScreen("practice"); return; }
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
      // Feedback is about the part the learner got wrong: its time word and the rule it signals.
      const partRule = markersOf(q).find((m) => m.marker === d.marker)?.rule || q.rule;
      fq = { ...q, marker: d.marker, rule: partRule };
      feedback = FEEDBACK[verdict].en(fq);
    }
    const entry = { session: "current", qid: q.id, prompt: q.prompt, rule: q.rule, level, format: q.format,
      response: answer, answer: q.answer, marker: q.marker, parts: q.parts, verdict, lang: hindi ? "hi" : "en", hintUsed, timeTakenMs, t: Date.now() };
    const newSession = [...session, entry];
    // Demo mode ignores response time (only the hint counts), so a walkthrough is reproducible while presenting.
    // The real time is still logged in the entry.
    const action = decide(verdict, newSession, { hintUsed, timeTakenMs: demo ? 0 : timeTakenMs });
    entry.action = action;
    setHistory((h) => [...h, entry]);
    setResult({ verdict, feedback, action, source, fq, hintUsed, timeTakenMs });
    setScreen("feedback");
  }

  function next() {
    const newLevel = nextLevel(level, result.action);
    setLevel(newLevel);
    setProfile((p) => ({ ...p, level: newLevel })); // saved, so "Continue practice" resumes here
    if (session.length >= sessionLen) { setScreen("summary"); return; }
    if (result.action === "alternative") { setScreen("alternative"); return; }
    if (result.action === "prerequisite") { setSorted({}); setScreen("prerequisite"); return; }
    loadQuestion(newLevel, result.verdict);
  }

  const last = session[session.length - 1];
  const step = ["practice", "feedback"].includes(screen) ? `Q ${Math.min(session.length + (screen === "practice" ? 1 : 0), sessionLen)}/${sessionLen}` : "";
  // Progress bar + level badge on every screen inside the practice loop.
  const prog = ["practice", "feedback", "alternative", "prerequisite"].includes(screen)
    ? { verdicts: session.map((h) => h.verdict), total: sessionLen, level }
    : null;
  const screenKey = screen === "practice" ? `practice-${q?.id}` : screen;

  // Bottom tabs. The tab bar is hidden inside the practice loop (question, feedback, timeline, mini-lesson)
  // so the learner stays focused, and shown again on the summary.
  const TAB_OF = { welcome: "home", home: "home", learn: "learn", concept: "learn", summary: "practice",
    mistakes: "mistakes", me: "me", about: "me" };
  const tab = TAB_OF[screen] || null;
  function goTab(t) {
    if (t === "home") setScreen("home");
    else if (t === "learn") setScreen("learn");
    else if (t === "practice") start();
    else if (t === "mistakes") setScreen("mistakes");
    else if (t === "me") setScreen("me");
  }

  // ---------- screens ----------
  if (screen === "about") return (
    <Shell prog={prog} screenKey={screenKey} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about}>
      <h1 className="text-xl font-bold mb-2">About</h1>
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
      <p className="mb-2"><b>Sections:</b> Home (continue at your level, today’s stats) · Learn (2 ideas + Hindi vs English) · Practice · Mistakes (notebook + “Practise my mistakes”) · Me (progress and settings: Hindi by default, left-handed mode, text size, reset). The time-word game is on Home.</p>
      <p className="mb-2"><b>AI:</b> Claude generates new questions and checks your “explain why” answers. Every AI question is checked by rules before you see it. If the AI is slow or fails, an “Offline question” from the teacher-written bank is shown instead.</p>
      <p className="mb-2"><b>Demo mode:</b> open the app with <code>?demo=1</code> (et617-24b3003.vercel.app/?demo=1) for a reproducible walkthrough: fixed teacher-written questions in a set order, no AI calls, and a separate log.</p>
      {demo && <p className="mb-2 text-sm text-slate-500">Demo mode · seed questions</p>}
      <p className="mb-2 text-sm text-slate-600">Answers logged on this phone: {history.length}</p>
      <Actions><Big onClick={() => setScreen(prevScreen === "about" ? "home" : prevScreen)}>Back</Big></Actions>
    </Shell>
  );

  if (screen === "home") {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todays = history.filter((h) => h.t >= today.getTime());
    const mistakes = history.filter((h) => h.verdict !== "correct").length;
    const startLabel = demo ? "Start practice (demo)" : firstTime ? "Start practice" : `Continue practice · Level ${profile.level || 1}`;
    const cards = [
      ["📘", "Learn the 2 ideas", "Finished time vs connected to now", () => { setCard(0); setConceptFrom("learn"); setScreen("concept"); }],
      ["🎯", "Time-word game", profile.bestGame != null ? `Best score: ${profile.bestGame}/10` : "Sort 10 time words", startGame],
      ["📒", `Practise my mistakes (${mistakes})`, mistakes ? "Your notebook of mix-ups" : "No mistakes yet", () => setScreen("mistakes")],
    ];
    return (
      <Shell prog={prog} screenKey={screenKey} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about} step={demo ? "Demo mode" : ""}>
        <h1 className="text-2xl font-bold">Namaste Ravi!</h1>
        <p className="text-base mt-1">Kal ya abhi? Let’s practise <b>“I went”</b> vs <b>“I have gone”</b>.</p>
        <Big onClick={() => start({ fromHome: true })}>▶ {startLabel}</Big>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[["Done today", todays.length], ["Correct", todays.filter((h) => h.verdict === "correct").length], ["Level", profile.level || 1]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white border border-slate-200 py-2">
              <p className="text-xl font-bold">{v}</p>
              <p className="text-sm text-slate-600">{k}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {cards.map(([icon, title, sub, go]) => (
            <button key={title} onClick={go}
              className="w-full min-h-[64px] rounded-xl bg-white border border-slate-200 px-3 flex items-center gap-3 text-left active:bg-indigo-50">
              <span className="text-2xl" aria-hidden="true">{icon}</span>
              <span className="flex-1"><b className="block">{title}</b><span className="text-sm text-slate-600">{sub}</span></span>
              <span className="text-slate-400" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  if (screen === "game") {
    const done = game.picks.length === GAME_WORDS.length;
    const shown = game.picks.length > game.i; // answered the current word, showing ✓/✗
    if (done) {
      const score = game.picks.filter((p) => p.ok).length;
      return (
        <Shell prog={prog} screenKey="game-end" tab="home" onTab={goTab} settings={profile} onAbout={about} step="Time-word game">
          <h2 className="text-xl font-bold text-center">Game over!</h2>
          <ScoreCircle correct={score} total={GAME_WORDS.length} />
          <p className="text-center text-base">Best score: <b>{profile.bestGame ?? score}/10</b></p>
          <div className="mt-3 flex flex-wrap gap-2">
            {game.picks.map((p) => (
              <span key={p.word} className={`rounded-full px-3 py-1 text-sm font-semibold ${p.ok ? "bg-green-100 text-green-900" : "bg-orange-100 text-orange-950"}`}>
                {p.ok ? "✓" : "✗"} {p.word}
              </span>
            ))}
          </div>
          <Actions>
            <Big onClick={startGame}>Play again</Big>
            <Big kind="secondary" onClick={() => setScreen("home")}>Back to Home</Big>
          </Actions>
        </Shell>
      );
    }
    const [word, rule, reason] = GAME_WORDS[game.i];
    const pick = game.picks[game.i];
    return (
      <Shell prog={prog} screenKey={`game-${game.i}`} onExit={() => setScreen("home")} settings={profile} onAbout={about}
        step={`Word ${game.i + 1}/${GAME_WORDS.length}`}>
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <p className="text-base text-slate-600">Is this time finished, or connected to now?</p>
          <p className={`mt-3 inline-block rounded-2xl px-5 py-3 text-3xl font-bold ${shown ? (rule === "past" ? "bg-amber-200 text-amber-950" : "bg-indigo-100 text-indigo-900") : "bg-white border-2 border-slate-300"}`}>{word}</p>
          {shown && (
            <p className={`mt-4 text-base font-semibold ${pick.ok ? "text-green-800" : "text-orange-900"}`}>
              {pick.ok ? "✓ Sahi! " : "✗ Not quite. "}<span className="font-normal text-slate-800">{reason}</span>
            </p>
          )}
        </div>
        <Actions>
          {shown
            ? <Big onClick={() => setGame((g) => ({ ...g, i: g.i + 1 }))}>{game.i + 1 < GAME_WORDS.length ? "Next word" : "See my score"}</Big>
            : (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => answerGame("past")} className="min-h-[88px] rounded-xl bg-amber-200 text-amber-950 border-2 border-amber-500 text-base font-bold active:bg-amber-300">Kal<br /><span className="text-base font-semibold">(finished)</span></button>
                <button onClick={() => answerGame("perfect")} className="min-h-[88px] rounded-xl bg-indigo-100 text-indigo-900 border-2 border-indigo-500 text-base font-bold active:bg-indigo-200">Abhi tak<br /><span className="text-base font-semibold">(connected to now)</span></button>
              </div>
            )}
        </Actions>
      </Shell>
    );
  }

  if (screen === "learn") return (
    <Shell prog={prog} screenKey={screenKey} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about} step="Learn">
      <h2 className="text-xl font-bold">Learn</h2>
      <MiniTimelines />
      <div className="mt-4 space-y-2">
        {LEARN_CARDS.map((c, i) => (
          <button key={c.title} onClick={() => { setCard(i); setConceptFrom("learn"); setScreen("concept"); }}
            className={`w-full min-h-[64px] rounded-xl bg-white border-2 px-3 flex items-center gap-3 text-left active:bg-slate-50 ${
              c.rule === "past" ? "border-amber-300" : c.rule === "perfect" ? "border-indigo-300" : "border-slate-300"}`}>
            <span className="text-2xl" aria-hidden="true">{c.icon}</span>
            <span className="flex-1"><b className="block">{c.title}</b><span className="text-sm text-slate-600">{c.sub}</span></span>
            <span className="text-slate-400" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </Shell>
  );

  if (screen === "concept") {
    const c = LEARN_CARDS[card];
    const fromLearn = conceptFrom === "learn";
    return (
      <Shell prog={prog} screenKey={`concept-${card}`} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about}
        step={fromLearn ? `Learn ${card + 1}/${LEARN_CARDS.length}` : `Idea ${card + 1}/2`}>
        <h2 className="text-xl font-bold">{c.title}</h2>
        {c.rule ? <Timeline rule={c.rule} /> : <MiniTimelines />}
        <div className="text-base mt-2">{c.body}</div>
        <p className={`mt-3 p-3 rounded-lg bg-white border text-base ${c.rule === "past" ? "border-amber-300" : c.rule === "perfect" ? "border-indigo-300" : "border-slate-300"}`}>🗣 {c.hindi}</p>
        <Actions>
          {fromLearn
            ? <>
                {card < LEARN_CARDS.length - 1 && <Big onClick={() => setCard(card + 1)}>Next card</Big>}
                <Big kind="secondary" onClick={() => setScreen("learn")}>Back to Learn</Big>
              </>
            : <>
                {card === 0
                  ? <Big onClick={() => setCard(1)}>Next idea</Big>
                  : <Big onClick={() => loadQuestion(1, null)}>Start practice</Big>}
                <Big kind="ghost" onClick={() => loadQuestion(1, null)}>Skip →</Big>
              </>}
        </Actions>
      </Shell>
    );
  }

  if (screen === "practice") {
    if (loading || !q) return (
      <Shell prog={prog} screenKey={screenKey} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about} step={step}><p className="text-base mt-8 text-center">Making your next question…</p></Shell>
    );
    const label = { mcq: "Choose the correct option", fill: "Fill in the blank", fix: "Find and fix the mistake", explain: "Explain in your own words" }[q.format];
    const source = demo ? "Demo mode · seed questions" : q.source === "ai" ? "AI-generated" : q.source === "offline" ? "Offline (AI unavailable)" : "Teacher-written";
    return (
      <Shell prog={prog} screenKey={screenKey} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about} step={step}>
        {/* The question card is vertically centred in the space above the answers. */}
        <div className="flex-1 flex flex-col justify-center">
        <div className="q-card rounded-2xl bg-white border border-slate-200 shadow-[0_4px_20px_rgba(15,23,42,0.08)] p-4">
          {/* Format label on its own line, the source pill on the line below (nothing wraps). */}
          <p className="text-sm font-semibold text-indigo-800">{label}</p>
          <span className="inline-block mt-1 mb-2 rounded-full bg-slate-100 text-slate-700 text-sm px-2 py-0.5">{source}</span>
          <p className="qtext text-xl font-medium leading-snug"><Sentence text={q.prompt} markers={markersOf(q)} /></p>
          {hintUsed ? (
            <p className="mt-3 p-3 rounded-lg bg-indigo-50 text-indigo-950 text-base" lang={hindi ? "hi-Latn" : "en"}>
              💡 <Sentence text={hindi ? HINT.hi(q) : HINT.en(q)} markers={[{ marker: q.marker, rule: q.rule }]} />
            </p>
          ) : (
            <button onClick={showHint} className="hint-btn mt-2 min-h-[48px] px-2 rounded-lg text-indigo-800 font-semibold active:bg-indigo-50">
              💡 Need a hint?
            </button>
          )}
        </div>
        </div>
        <Actions>
          {q.format === "mcq" ? (
            q.options.map((o, i) => <Option key={o} letter={"ABC"[i]} onClick={() => check(o)}>{o}</Option>)
          ) : (
            <>
              {/* Input and Check sit together in normal flow (no fixed positioning), so when the on-screen
                  keyboard opens the page resizes and the Check button stays directly under the input. */}
              {q.format === "explain"
                ? <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} onFocus={keepCheckVisible}
                    placeholder="Because…" className="w-full rounded-xl border-2 border-indigo-300 p-3 text-base" />
                : <input value={input} onChange={(e) => setInput(e.target.value)} autoCapitalize="none" onFocus={keepCheckVisible}
                    enterKeyHint="done" onKeyDown={(e) => e.key === "Enter" && input.trim() && check(input)}
                    placeholder={q.format === "fix" ? "Type the correct sentence"
                      : (q.prompt.match(/___/g) || []).length > 1 ? "Fill both blanks, e.g. have seen … went" : "Type the verb, e.g. went"}
                    className="w-full min-h-[52px] rounded-xl border-2 border-indigo-300 px-3 text-base" />}
              <MicButton onText={(t) => { setInput(t); setEvents((e) => [...e, { type: "speech", qid: q.id, text: t, t: Date.now() }]); }} />
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
    const mixup = UI_TEXT[hindi ? "hi" : "en"].mixup[result.verdict];
    const fq = result.fq;
    const explain = fq.format === "explain";
    const ruleLine = hindi ? FEEDBACK[result.verdict].hi(fq) : result.feedback;
    return (
      <Shell prog={prog} screenKey={screenKey} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about} step={step}>
        {/* 1. Status line */}
        <div className={`rounded-xl px-4 py-3 ${good ? "bg-green-100 text-green-900" : "bg-orange-100 text-orange-950"}`}>
          <p className="text-xl font-bold">{good ? "✓ Sahi!" : mixup ? "↺ Common mix-up" : "↺ Not quite"}</p>
          {mixup && <p className="text-base">{mixup}</p>}
        </div>

        {/* 2. Answer comparison + the full correct sentence */}
        <div className="mt-3 rounded-xl bg-white border border-slate-200 p-4 space-y-1">
          <p className="text-base text-slate-700">Your answer:{" "}
            {good || explain
              ? <span className={good ? "font-semibold text-green-800" : "text-slate-900"}>{last?.response}</span>
              : <s className="font-semibold text-red-700 decoration-2">{last?.response}</s>}
          </p>
          {!good && <p className="text-base text-slate-700">{explain ? "Model answer:" : "Correct:"} <span className="font-semibold text-green-800">{fq.answer}</span></p>}
          {!explain && <p className="ftext pt-2 text-lg leading-snug"><CorrectSentence q={fq} /></p>}
        </div>

        {/* 3. One short rule line */}
        <p className="ftext mt-3 text-base" lang={hindi ? "hi-Latn" : "en"}>
          <Sentence text={ruleLine} markers={[{ marker: fq.marker, rule: fq.rule }]} />
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {hindi ? "Hindi explanation (teacher-written)" : result.source === "ai" ? "Feedback by AI tutor" : result.source === "offline" ? "Offline feedback (AI unavailable)" : ""}
        </p>
        <p className="mt-1 text-sm text-slate-600">{decisionLine(result, demo, hindi ? "hi" : "en")}</p>
        <Actions>
          <HindiSwitch on={hindi} onClick={toggleHindi} />
          <Big onClick={next}>{session.length >= sessionLen ? "See my progress" : nextText}</Big>
        </Actions>
      </Shell>
    );
  }

  if (screen === "alternative") {
    const fq = result?.fq || q; // the item just answered, with the time word of the part that was wrong
    const rule = fq?.rule || last?.rule || "past";
    const TL = UI_TEXT[hindi ? "hi" : "en"].timeline;
    return (
      <Shell prog={prog} screenKey={screenKey} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about} step="Another way to see it">
        <h2 className="text-xl font-bold" lang={hindi ? "hi-Latn" : "en"}>{TL[rule].heading}</h2>
        <Timeline rule={rule} marker={fq?.marker} />
        <p className="text-base" lang={hindi ? "hi-Latn" : "en"}>{TL[rule].text}</p>
        <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200">
          <p className="text-sm text-slate-600">{TL.correctSentence}</p>
          <p className="text-lg leading-snug">
            {fq && fq.format !== "explain" ? <CorrectSentence q={fq} /> : <Sentence text={fq?.answer || ""} markers={fq ? markersOf(fq) : []} />}
          </p>
        </div>
        <Actions>
          <HindiSwitch on={hindi} onClick={toggleHindi} />
          <Big onClick={() => loadQuestion(level, last?.verdict)}>Try a similar question</Big>
        </Actions>
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
    const L = UI_TEXT[hindi ? "hi" : "en"].lesson;
    return (
      <Shell prog={prog} screenKey={screenKey} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about} step="Mini-lesson: time words">
        <h2 className="text-xl font-bold" lang={hindi ? "hi-Latn" : "en"}>{L.heading}</h2>
        <p className="mt-1 text-base" lang={hindi ? "hi-Latn" : "en"}>{L.instruction}</p>
        <div className="mt-3 space-y-2">
          {words.map(([w, r]) => {
            const pick = sorted[w];
            return (
              <div key={w} className="rounded-lg bg-white border border-amber-300 p-2">
                <p className="font-semibold">{w} {pick && (pick === r ? "✓" : L.tryAgain)}</p>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setSorted({ ...sorted, [w]: "past" })}
                    className={`flex-1 min-w-0 min-h-[48px] px-1 rounded-lg border-2 text-sm leading-tight active:bg-amber-100 ${pick === "past" ? "bg-amber-200 border-amber-600" : "border-amber-300"}`}>{LESSON_BUTTONS.past}</button>
                  <button onClick={() => setSorted({ ...sorted, [w]: "perfect" })}
                    className={`flex-1 min-w-0 min-h-[48px] px-1 rounded-lg border-2 text-sm leading-tight active:bg-indigo-100 ${pick === "perfect" ? "bg-indigo-200 border-indigo-600" : "border-indigo-300"}`}>{LESSON_BUTTONS.perfect}</button>
                </div>
              </div>
            );
          })}
        </div>
        {done && allRight && <p className="mt-3 text-green-800 font-semibold" lang={hindi ? "hi-Latn" : "en"}>{L.done}</p>}
        <Actions>
          <HindiSwitch on={hindi} onClick={toggleHindi} />
          <Big disabled={!(done && allRight)} onClick={() => loadQuestion(level, last?.verdict)}>Back to practice (easier level)</Big>
        </Actions>
      </Shell>
    );
  }

  if (screen === "me") {
    const acc = (rule) => {
      const s = history.filter((h) => h.rule === rule);
      return s.length ? Math.round((100 * s.filter((h) => h.verdict === "correct").length) / s.length) : 0;
    };
    const count = (v) => history.filter((h) => h.verdict === v).length;
    const Switch = ({ label, on, onClick }) => (
      <button role="switch" aria-checked={on} onClick={onClick}
        className="hand-row w-full min-h-[52px] px-3 flex items-center justify-between rounded-xl bg-white border border-slate-200 text-left active:bg-slate-50">
        <span>{label}</span>
        <span className={`w-12 h-7 rounded-full p-1 ${on ? "bg-green-600" : "bg-slate-300"}`}>
          <span className={`block w-5 h-5 rounded-full bg-white transition ${on ? "translate-x-5" : ""}`} />
        </span>
      </button>
    );
    return (
      <Shell prog={prog} screenKey={screenKey} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about} step="Me">
        <h2 className="text-xl font-bold">My progress</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          {[["Level", profile.level || 1], ["Sessions", profile.sessions || 0], ["Best game", profile.bestGame != null ? `${profile.bestGame}/10` : "—"]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white border border-slate-200 py-2"><p className="text-xl font-bold">{v}</p><p className="text-sm text-slate-600">{k}</p></div>
          ))}
        </div>
        {[["Finished time → simple past", acc("past"), "bg-amber-500"], ["Connected to now → present perfect", acc("perfect"), "bg-indigo-700"]].map(([t, p, c]) => (
          <div key={t} className="mt-3">
            <p className="text-sm flex items-baseline gap-2 mb-1"><span className="flex-1 min-w-0">{t}</span><b className="shrink-0 text-base">{p}%</b></p>
            <div className="h-3 rounded-full bg-slate-200"><div className={`h-3 rounded-full ${c}`} style={{ width: `${p}%` }} /></div>
          </div>
        ))}
        <div className="mt-3 flex flex-wrap gap-2">
          {[["M1", "“have + V3” with finished time"], ["M2", "“am …ing” with since/for"], ["M3", "“did” with ever/just"]]
            .filter(([v]) => count(v) > 0)
            .map(([v, t]) => (
              <span key={v} className="rounded-full bg-orange-100 text-orange-950 px-3 py-1 text-sm font-semibold">{t} × {count(v)}</span>
            ))}
          {["M1", "M2", "M3"].every((v) => count(v) === 0) && (
            <span className="rounded-full bg-green-100 text-green-900 px-3 py-1 text-sm font-semibold">No mix-ups yet 🎉</span>
          )}
        </div>

        <h2 className="text-xl font-bold mt-5">Settings</h2>
        <div className="mt-2 space-y-2">
          <Switch label="Hindi explanations on by default" on={hindi} onClick={toggleHindi} />
          <Switch label="Left-handed mode" on={!!profile.leftHanded} onClick={() => setSetting("leftHanded", !profile.leftHanded)} />
          <div className="rounded-xl bg-white border border-slate-200 p-2">
            <p className="px-1 pb-1">Text size</p>
            <div className="grid grid-cols-2 gap-2">
              {[["normal", "Normal"], ["large", "Large"]].map(([v, l]) => (
                <button key={v} onClick={() => setSetting("textSize", v)} aria-pressed={(profile.textSize || "normal") === v}
                  className={`w-full min-w-0 min-h-[48px] rounded-lg border-2 font-semibold active:bg-indigo-100 ${(profile.textSize || "normal") === v ? "bg-indigo-700 text-white border-indigo-700" : "border-slate-300"}`}>{l}</button>
              ))}
            </div>
          </div>
          {confirmReset ? (
            <div className="rounded-xl bg-red-50 border-2 border-red-300 p-3">
              <p className="font-semibold text-red-900">Delete all your answers, level and scores on this phone? Settings are kept.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={resetProgress} className="min-h-[48px] rounded-lg bg-red-700 text-white font-semibold active:bg-red-800">Yes, reset</button>
                <button onClick={() => setConfirmReset(false)} className="min-h-[48px] rounded-lg border-2 border-slate-300 font-semibold active:bg-slate-100">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="w-full min-h-[52px] rounded-xl bg-white border border-red-300 text-red-800 font-semibold active:bg-red-50">Reset my progress</button>
          )}
          <button onClick={about} className="w-full min-h-[52px] rounded-xl bg-white border border-slate-200 font-semibold active:bg-slate-50">About this app</button>
        </div>
      </Shell>
    );
  }

  if (screen === "mistakes") {
    const TAG = { M1: "“have + V3” with finished time", M2: "“am …ing” with since/for", M3: "“did” with ever/just", other: "Not quite" };
    return (
      <Shell prog={prog} screenKey={screenKey} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about} step="Mistakes">
        <h2 className="text-xl font-bold">My mistake notebook</h2>
        {!mistakes.length && <p className="mt-3 rounded-xl bg-green-100 text-green-900 p-3 font-semibold">No mistakes yet — great!</p>}
        <div className="mt-3 space-y-2">
          {[...mistakes].reverse().map((h, i) => {
            const item = { ...(byId(h.qid) || {}), ...h, prompt: h.prompt, rule: h.rule };
            const correct = h.answer || byId(h.qid)?.answer || "—";
            return (
              <div key={i} className="rounded-xl bg-white border border-slate-200 p-3">
                <span className="inline-block rounded-full bg-orange-100 text-orange-950 text-sm font-semibold px-2 py-0.5">{TAG[h.verdict] || TAG.other}</span>
                <p className="mt-1 text-base leading-snug"><Sentence text={h.prompt} markers={item.marker ? markersOf(item) : []} /></p>
                <p className="text-base">Your answer: <s className="text-red-700 font-semibold decoration-2">{h.response}</s></p>
                <p className="text-base">Correct: <span className="text-green-800 font-semibold">{correct}</span></p>
              </div>
            );
          })}
        </div>
        {mistakes.length > 0 && (
          <Actions><Big onClick={startMistakes}>✏️ Practise my mistakes</Big></Actions>
        )}
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
      <Shell prog={prog} screenKey={screenKey} tab={tab} onTab={goTab} onExit={() => setScreen("home")} settings={profile} onAbout={about} step="Your progress">
        <h2 className="text-xl font-bold text-center">{mode === "mistakes" ? "Mistakes practice done!" : "Well done, you finished!"}</h2>
        <ScoreCircle correct={correct} total={session.length} />
        <p className="text-center text-base text-slate-700">reached level {level}</p>
        {[["Finished time → simple past", pct("past"), "bg-amber-500"], ["Connected to now → present perfect", pct("perfect"), "bg-indigo-700"]].map(([t, p, c]) => (
          <div key={t} className="mt-3">
            <p className="text-sm flex items-baseline gap-2 mb-1"><span className="flex-1 min-w-0">{t}</span><b className="shrink-0 text-base">{p}%</b></p>
            <div className="h-3 rounded-full bg-slate-200"><div className={`h-3 rounded-full ${c}`} style={{ width: `${p}%` }} /></div>
          </div>
        ))}
        <div className="mt-4 flex flex-wrap gap-2">
          {m1 > 0 && <span className="rounded-full bg-orange-100 text-orange-950 px-3 py-1 text-sm font-semibold">“have + V3” with finished time × {m1}</span>}
          {m2 > 0 && <span className="rounded-full bg-orange-100 text-orange-950 px-3 py-1 text-sm font-semibold">“am …ing” with since/for × {m2}</span>}
          {m3 > 0 && <span className="rounded-full bg-orange-100 text-orange-950 px-3 py-1 text-sm font-semibold">“did” with ever/just × {m3}</span>}
          {m1 + m2 + m3 === 0 && <span className="rounded-full bg-green-100 text-green-900 px-3 py-1 text-sm font-semibold">No common mix-ups — great!</span>}
        </div>
        <Actions><Big onClick={start}>Practise again</Big></Actions>
      </Shell>
    );
  }
  return null;
}
