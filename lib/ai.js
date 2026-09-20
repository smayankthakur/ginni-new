// AI fallback layer — only ever called when lib/classify.js's free keyword
// matcher can't confidently map a question to one of the 15 topics, or the
// question wasn't typed in Hinglish/English/Hindi's Latin script at all
// (see looksNonLatinScript() in classify.js). Every other question — the
// large majority, in practice — never reaches this file and costs nothing.
//
// One Anthropic API call does both jobs at once, to keep this to a single
// round-trip: it's shown the drawn card's *actual* reading from every one of
// the 13 underlying data files (see readingsForCard() below), the user's
// real question, and asked to either (a) translate whichever listed reading
// genuinely answers their question into their own language, staying
// faithful to it, or (b) — only if none of the 15 topics fit — write a new
// reading itself, in Ginni's voice, in the user's language. This is what
// satisfies "map the question from the list and read from the data folder;
// only write an AI reading if nothing matches."
//
// Requires ANTHROPIC_API_KEY to be set. If it's missing, or the API call
// fails for any reason, composeAIReading() returns null and the caller
// (app/api/reveal/route.js) falls back to a plain "try again" message —
// exactly like any other reveal failure already does.

import Anthropic from "@anthropic-ai/sdk";
import { TOPICS } from "@/lib/topics";
import { READINGS } from "@/lib/readings";
import { getReadingFor } from "@/lib/parseReading";

const MODEL = "claude-haiku-4-5-20251001"; // fast + inexpensive: this only ever runs for the fallback path

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// One reference block per unique underlying data file (13, not 15 — topics
// 1&3 and 2&4 each share a file, see lib/topics.js), each holding whatever
// this exact drawn card says for that topic. Skips any file that has no
// usable Hinglish text for this card rather than passing AI a placeholder.
function readingsForCard(card) {
  const seen = new Map();
  for (const t of TOPICS) {
    if (seen.has(t.dataKey)) {
      seen.get(t.dataKey).titles.push(t.title);
      continue;
    }
    seen.set(t.dataKey, { titles: [t.title], dataKey: t.dataKey });
  }

  const blocks = [];
  for (const { titles, dataKey } of seen.values()) {
    const raw = READINGS[dataKey]?.[card];
    if (!raw) continue;
    const { text, available } = getReadingFor(raw, "hinglish");
    if (!available) continue;
    blocks.push({ label: titles.join(" / "), text });
  }
  return blocks;
}

const SYSTEM_PROMPT = `You are Ginni, a warm Hinglish-speaking tarot reader who runs "Ginni Ki Baatein." You speak with gentle warmth and mystical confidence, address the person affectionately, and occasionally use soft emoji like 🌙 💜 ✨ — never more than one or two per reply. You never break character, never mention being an AI, and never add disclaimers, headers, or meta-commentary. You only ever output the reading itself, nothing else.`;

function buildPrompt({ card, question, blocks }) {
  const reference = blocks
    .map((b, i) => `[${i + 1}] Topic: ${b.label}\nReading for this card:\n${b.text}`)
    .join("\n\n---\n\n");

  return `The seeker drew: ${card}

Their question, exactly as they typed it:
"""
${question}
"""

Below are Ginni Ki Baatein's own existing readings for this exact card, one for each of the topics the app already supports:

${reference || "(no reference readings were available for this card)"}

Instructions:
1. Work out what language and script the seeker's question is written in.
2. Decide whether their question is really just one of the topics listed above, asked in their own words or language. If so, take THAT reading and render it faithfully in the seeker's language — same guidance, same meaning, just natural in their language, in Ginni's voice. Do not invent new advice when a listed reading already answers them.
3. Only if none of the listed topics genuinely match what they're asking, write a new reading yourself — grounded in this card's traditional tarot meaning, addressing their specific question, in Ginni's voice, in their language.
4. Always reply in the same language and script the seeker used, whatever it is.
5. Reply with ONLY the reading itself — no preamble, no labels, no quotation marks, no markdown, no translation notes. 100-180 words.`;
}

// Returns the finished reading text, or null on any failure (missing key,
// network error, empty response) — never throws.
export async function composeAIReading({ card, question }) {
  const anthropic = getClient();
  if (!anthropic || !card || !question) return null;

  try {
    const blocks = readingsForCard(card);
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt({ card, question, blocks }) }],
    });

    const text = message?.content?.find((b) => b.type === "text")?.text?.trim();
    return text || null;
  } catch (err) {
    console.error("composeAIReading failed:", err);
    return null;
  }
}
