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
// Swap this file out later if you ever want real NLU/LLM-based understanding
// instead — everything downstream (ChatPanel) only cares that it gets back
// a valid topic id.

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

const FALLBACK_ID = 7; // Universe Message — same safe default tdt's engine uses

export function classifyQuestion(text) {
  const t = (text || "").trim();
  if (!t) return FALLBACK_ID;

  for (const { id, re } of RULES) {
    if (re.test(t)) return id;
  }

  if (FEELINGS_RE.test(t)) return CRUSH_RE.test(t) ? 3 : 1;
  if (ACTION_RE.test(t)) return CRUSH_RE.test(t) ? 4 : 2;

  return FALLBACK_ID;
}
