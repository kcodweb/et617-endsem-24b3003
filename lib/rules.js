// Rule-based check of a free-text explanation. Used when the AI is unavailable (offline fallback)
// and in demo mode. Returns "correct" | "M1" | "M2" | "other".
const REJECTS = /\b(wrong|not|nahi|nahin|galat|incorrect|cannot|can't)\b/;
const M2_FORM = /\b(is|am|are)\s+\w+ing\b/;
const M1_IDEA = /(have|has)\s+\w+.*\b(yesterday|last|ago)\b.*\b(ok|fine|correct|right)\b|(have|has)( \w+)? means past/;
const CORRECT_WORDS = /\b(finish\w*|over|now|connect\w*|abhi|khatam|still|ab tak|tab se)\b/;

export function ruleCheck(response, marker) {
  const r = (response || "").toLowerCase();
  const rejects = REJECTS.test(r); // the learner names a form only to reject it, e.g. "am living is wrong"
  if (M2_FORM.test(r) && !rejects) return "M2";
  if (M1_IDEA.test(r) && !rejects) return "M1";
  const mentionsMarker = marker && r.includes(marker.toLowerCase());
  if (mentionsMarker || CORRECT_WORDS.test(r)) return "correct";
  return "other";
}
