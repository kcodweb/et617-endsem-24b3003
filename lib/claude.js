// Minimal server-side call to the Anthropic Messages API (no SDK).
// The key is read from the ANTHROPIC_API_KEY environment variable (set in Vercel, never committed).

export const MODEL = "claude-haiku-5-5";

export async function askClaude(system, user, maxTokens = 400) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("no-key");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000); // slow network -> fall back quickly
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error("api-" + res.status);
    const data = await res.json();
    const text = data.content?.map((c) => c.text || "").join("") || "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    return JSON.parse(json);
  } finally {
    clearTimeout(timer);
  }
}
