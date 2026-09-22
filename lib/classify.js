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
// By default (no AI provider key configured — see lib/ai.js) a question
// that doesn't match any of the 15 topics still always gets a real reading:
// ChatPanel.jsx sends it through with the "ai" sentinel topicId, and
// /api/reveal/route.js falls back to lib/localFallback.js — a zero-cost,
// zero-API local reading built from this app's own data. If an AI key is
// configured later, that same sentinel routes to real AI instead. Either
// way, nothing here ever silently gives up: see isOffTopicChitchat() below
// for the one case (small talk, not a question at all) that's handled
// before any of this even runs.

const RULES = [
  { id: 10, re: /\bbaby\b|pregnan|conceive|\bbach[ae]\b|santaan|aulad|garbh|parenthood|\bchild\b/i },
  { id: 14, re: /shaadi|marriage|married|vivah|byah|wedding|\bmarry\b|getting married/i },
  { id: 11, re: /soulmate|soul ?partner/i },
  { id: 13, re: /\bunion\b|reunion|\bmilan\b|wapas aayenge|reunite|back together|patch ?up|wapas milna/i },
  { id: 15, re: /life ?partner|jeevansa?thi/i },
  { id: 6, re: /third[\s-]?party|\baffair\b|interfere|interference|teesr|cheating|other (woman|man|guy|girl)|outsider/i },
  { id: 8, re: /spr?itual journey|twin ?flame|karmic|connection type|spiritual path|life purpose|meri destiny|bhavishya ka raasta/i },
  { id: 9, re: /\bmonth\b|mahin|mahine|forecast|this month|coming weeks|agle kuch hafte/i },
  { id: 12, re: /past.*present.*future|relationship status|relationship dynamic|\brisht|relationship going|kahan ja raha hai (yeh|ye) rishta|where is this relationship/i },
  { id: 5, re: /yes\s*(?:\/|or)?\s*no|haan ya nahi|will i\b|should i\b/i },
  { id: 7, re: /universe|guidance|margdarshan/i },
];

// Feelings vs. next-action questions share their reading data across two
// topics each (an established partner vs. a crush) — see lib/topics.js's
// comment on topics 1&3 / 2&4. We route on those two axes separately so
// free text lands on the right *label*, even though both members of a pair
// pull the same underlying reading.
const FEELINGS_RE = /\bfeel|feeling|soch|dil me[in]?n|mann me[in]?n|kya sochta|kya soch rah|true love|loves? me|cares? about me|thinks? of me|pyaar karta|pyaar karti/i;
const ACTION_RE = /\baction|kadam|next move|contact kareg|reach out|wapas aayega|propose|commit|text me|call me|make a move|milne aayega/i;
const CRUSH_RE = /crush|pasand karta|pasand karti/i;

// Everyday small talk that isn't a tarot question at all — greetings,
// thanks, filler. Deliberately a short, exact-phrase allowlist (anchored
// start-to-end) rather than a loose keyword search: it should only ever
// catch messages that are *just* this, so "hi, when will I get married"
// still falls through to a real reading instead of being brushed off.
const CHITCHAT_RES = [
  /^(hi+|hello+|hey+|yo|namaste|namaskar)[\s!.]*$/i,
  /^(kese ho|kaise ho|kaisi ho|how are you|hows it going|what'?s up|wassup)[\s?!.]*$/i,
  /^(ok|okay|thik hai|theek hai|thank you|thanks|shukriya|dhanyavad|bye|good ?(morning|night|evening|afternoon))[\s!.]*$/i,
  /^(lol|ha+ha+|he+he+|nice|cool|great|good|acha|accha)[\s!.]*$/i,
];

// True only for messages that are *just* small talk with nothing else in
// them — see CHITCHAT_RES above. ChatPanel.jsx checks this before
// classifyQuestion() and, if true, replies in character with no card draw
// at all rather than forcing a reading out of "hi."
export function isOffTopicChitchat(text) {
  const t = (text || "").trim();
  if (!t) return false;
  return CHITCHAT_RES.some((re) => re.test(t));
}

// Returns a topic id (1-15) on a confident keyword match, or null when
// nothing fires — null means "fall back to a local universal reading," not
// "assume topic 7." See lib/localFallback.js for what happens next.
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
