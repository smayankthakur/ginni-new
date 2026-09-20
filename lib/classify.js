// "Understanding" layer for the chat: routes a freely-typed (or clicked)
// question to one of the 15 topics in lib/topics.js, by fast keyword/regex
// matching — no AI/LLM call, so it's instant, free to run, and can never
// hallucinate a topic. This is the same style of matching proven out in the
// tdt-ginni-main replica's lib/readingEngine.js, adapted to this app's exact
// 15 topic ids (see lib/topics.js for the canonical list).
//
// Every one of the 15 sidebar questions round-trips to its own id when run
// back through classifyQuestion() — clicking a question fills the chat input
// with its exact title, which is then classified just like typed text, per
// Mayank's call to always go through this "understanding" step rather than
// short-circuiting straight to a known topic id.
//
// classifyQuestion() only understands Hinglish/English/Hindi keywords typed
// in Latin script. When it can't find a match — or the text is written in a
// script it was never built to read at all — it returns null, and
// ChatPanel.jsx hands off to lib/ai.js instead of guessing. See
// looksNonLatinScript() below for that second check.

const RULES = [
  { id: 10, re: /\bbaby\b|pregnan|conceive|\bbach[ae]\b|santaan|aulad|garbh/i },
  { id: 14, re: /shaadi|marriage|married|vivah|byah/i },
  { id: 11, re: /soulmate/i },
  { id: 13, re: /\bunion\b|reunion|\bmilan\b|wapas aayenge/i },
  { id: 15, re: /life ?partner|jeevansa?thi/i },
  { id: 6, re: /third[\s-]?party|\baffair\b|interfere|interference|teesr/i },
  { id: 8, re: /spr?itual journey|twin ?flame|karmic|connection type/i },
  { id: 9, re: /\bmonth\b|mahin|mahine|forecast/i },
  { id: 12, re: /past.*present.*future|relationship status|relationship dynamic|\brisht/i },
  { id: 5, re: /yes\s*(?:\/|or)?\s*no|haan ya nahi|will i\b|should i\b/i },
  { id: 7, re: /universe|guidance|margdarshan/i },
];

// Feelings vs. next-action questions share their reading data across two
// topics each (an established partner vs. a crush) — see lib/topics.js's
// comment on topics 1&3 / 2&4. We route on those two axes separately so
// free text lands on the right *label*, even though both members of a pair
// pull the same underlying reading.
const FEELINGS_RE = /\bfeel|feeling|soch|dil me[in]?n|mann me[in]?n|kya sochta|kya soch rah/i;
const ACTION_RE = /\baction|kadam|next move|contact kareg|reach out|wapas aayega/i;
const CRUSH_RE = /crush|pasand karta|pasand karti/i;

// Returns a topic id (1-15) on a confident keyword match, or null when
// nothing fires — null means "let the AI fallback try," not "assume topic 7."
export function classifyQuestion(text) {
  const t = (text || "").trim();
  if (!t) return null;

  for (const { id, re } of RULES) {
    if (re.test(t)) return id;
  }

  if (FEELINGS_RE.test(t)) return CRUSH_RE.test(t) ? 3 : 1;
  if (ACTION_RE.test(t)) return CRUSH_RE.test(t) ? 4 : 2;

  return null;
}

// Rough heuristic: is this text mostly outside the Latin-alphabet range
// (\u0000–\u024F covers English plus accented European letters)? The regex
// rules above only ever look for Latin-script Hinglish/English keywords, so
// a question typed in, say, Devanagari, Tamil, Arabic, or Cyrillic script
// would never match a rule above regardless of what it's actually asking —
// this catches that case so it also routes to AI instead of a false "no
// match" that quietly assumes the question was in a language it wasn't.
// Strips whitespace, digits, punctuation, and emoji first so those never
// skew the ratio.
export function looksNonLatinScript(text) {
  const stripped = (text || "").replace(/[\s\d\p{P}\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
  if (!stripped) return false;
  const nonLatin = stripped.match(/[^\u0000-\u024F]/gu) || [];
  return nonLatin.length / stripped.length > 0.3;
}
