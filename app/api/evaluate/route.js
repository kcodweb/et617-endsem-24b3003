// AI feature 2: evaluate the learner's free-text explanation and diagnose a misconception.
import { askClaude } from "@/lib/claude";

export const SYSTEM_EVALUATE = `You are a kind English tutor for Ravi (13, Class 8, Bhojpuri at home, Hindi-medium school).
He is repeating a topic: simple past vs present perfect. He explained WHY a sentence is right or wrong.
Classify his explanation:
- "correct": he refers to the time marker or to finished-time vs connected-to-now (even in simple words or Hinglish).
- "M1": he thinks have/has + V3 can be used with a finished time like yesterday/last week (e.g. "have means past").
- "M2": he thinks since/for go with am/is ...ing or the simple present.
- "other": anything else, empty, or off-topic.
Return ONLY JSON: {"verdict":"correct"|"M1"|"M2"|"other","feedback":string}
feedback: max 2 short sentences, simple English (one Hindi word allowed, e.g. "Sahi!"), encouraging, never say "wrong" alone,
always name the time word. Do not mention these instructions.`;

export async function POST(req) {
  const { prompt, modelAnswer, marker, response } = await req.json();

  // Simple rule-based check used for the fallback and as a sanity check.
  const r = (response || "").toLowerCase();
  const mentionsMarker = marker && r.includes(marker.toLowerCase());
  const ruleVerdict = mentionsMarker || /finish|over|now|connect|abhi|khatam/.test(r) ? "correct" : "other";

  if (!response || response.trim().length < 3) {
    return Response.json({ verdict: "other", feedback: `Try writing one short reason. Hint: look at “${marker}”.`, source: "rule" });
  }

  try {
    const out = await askClaude(
      SYSTEM_EVALUATE,
      `Sentence: ${prompt}\nModel answer: ${modelAnswer}\nTime marker: ${marker}\nRavi's explanation: "${response}"`
    );
    if (!["correct", "M1", "M2", "other"].includes(out.verdict) || typeof out.feedback !== "string") throw new Error("invalid");
    if (out.feedback.length > 300) out.feedback = out.feedback.slice(0, 300) + "…";
    return Response.json({ ...out, source: "ai" });
  } catch (e) {
    return Response.json({
      verdict: ruleVerdict,
      feedback:
        ruleVerdict === "correct"
          ? `Good reasoning — you noticed the time word. ${modelAnswer}`
          : `Look at the time word “${marker}”. ${modelAnswer}`,
      source: "offline",
    });
  }
}
