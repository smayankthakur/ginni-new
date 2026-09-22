// Zero-cost, zero-API fallback for a question that classifyQuestion()
// couldn't map to any of the 15 topics. This is what runs by default —
// no AI provider key needed, no external call, no per-message cost — so
// "system must respond to every question" holds true even on a completely
// free deployment. If an AI key is ever configured later (see lib/ai.js),
// /api/reveal/route.js tries that first and only falls back to this when
// there's no key configured or the AI call itself fails.
//
// The approach: this app's "Universe Message" reading (one of the 15
// topics, meant to be broadly applicable guidance rather than about one
// specific life question) is genuinely relevant to almost any question a
// seeker would bring to a tarot reader. This wraps that real, existing
// reading with a line that echoes the seeker's own question back to them,
// so the response still feels directed at what they actually asked even
// though the underlying guidance is the same for everyone who draws that
// card. It's not a substitute for true per-question AI writing — it's the
// honest, always-available floor under it.

import { TOPICS } from "@/lib/topics";
import { READINGS } from "@/lib/readings";
import { getReadingFor } from "@/lib/parseReading";

const INTRO_LINE = {
  hinglish: (q) => `Aapne poocha: "${q}" — iske liye universe ka yeh sandesh hai:`,
  english: (q) => `You asked: "${q}" — here's what the universe has to say:`,
  hindi: (q) => `आपने पूछा: "${q}" — इसके लिए ब्रह्मांड का यह संदेश है:`,
};

// Returns the finished reading text, or null only in the extreme edge case
// where even the Universe Message file has no usable text for this card
// (shouldn't happen — verified all 78 cards have text in every file — but
// this never throws either way).
export function composeLocalReading({ card, question, lang }) {
  const universeTopic = TOPICS.find((t) => t.dataKey === "universeGuidance");
  const raw = universeTopic && READINGS[universeTopic.dataKey]?.[card];
  if (!raw) return null;

  const { text, available } = getReadingFor(raw, lang || "hinglish");
  if (!available) return null;

  const intro = (INTRO_LINE[lang] || INTRO_LINE.hinglish)((question || "").trim());
  return `${intro}\n\n${text}`;
}
