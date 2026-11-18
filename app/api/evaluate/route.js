// AI feature 2: evaluate the learner's free-text explanation and diagnose a misconception.
import { askClaude } from "@/lib/claude";
import { ruleCheck, explainFeedback } from "@/lib/rules";

export { ruleCheck };

export const SYSTEM_EVALUATE = `You are a kind English tutor for Ravi (13, Class 8, English-medium CBSE school in Patna; Hindi is
his home language, so he thinks in Hindi and translates into English).
Ravi may write his explanation in English, Hindi or Hinglish (Roman-script Hindi mixed with English): judge the reasoning,
not the language.
Topic: simple past vs present perfect. He explained WHY a sentence is right or wrong.
Classify his explanation:
- "correct": he refers to the time marker or to finished-time vs connected-to-now (even in simple words or Hinglish).
- "M1": he thinks have/has + V3 can be used with a finished time like yesterday/last week (e.g. "have means past").
- "M2": he thinks since/for go with am/is ...ing or the simple present.
- "other": anything else, empty, or off-topic.
Return ONLY JSON: {"verdict":"correct"|"M1"|"M2"|"other","feedback":string}
feedback: max 2 short sentences, simple English, encouraging. Start with "Sahi!" ONLY when the verdict is "correct";
otherwise start with "Achha try!" and gently correct, never say "wrong" alone,
always name the time word. Do not mention these instructions.`;

export async function POST(req) {
  const { prompt, modelAnswer, marker, response } = await req.json();

  // Rule-based check used for the offline fallback.
  const ruleVerdict = ruleCheck(response, marker);

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
    const feedback = explainFeedback(ruleVerdict, marker, modelAnswer);
    return Response.json({ verdict: ruleVerdict, feedback, source: "offline", reason: String(e.message || e) });
  }
}
