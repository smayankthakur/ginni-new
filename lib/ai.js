// AI fallback layer — only ever called when lib/classify.js's free keyword
// matcher can't confidently map a question to one of the 15 topics, or the
// question wasn't typed in Hinglish/English/Hindi's Latin script at all
// (see looksNonLatinScript() in classify.js). Every other question — the
// large majority, in practice — never reaches this file and costs nothing.
//
// One API call does both jobs at once, to keep this to a single round-trip:
// it's shown the drawn card's *actual* reading from every one of the 13
// underlying data files (see readingsForCard() below), the user's real
// question, and asked to either (a) translate whichever listed reading
// genuinely answers their question into their own language, staying
// faithful to it, or (b) — only if none of the 15 topics fit — write a new
// reading itself, in Ginni's voice, in the user's language. This is what
// satisfies "map the question from the list and read from the data folder;
// only write an AI reading if nothing matches."
//
// Works with ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY —
// whichever is set. If more than one is set, Anthropic wins, then OpenAI,
// then Gemini. If none are set, or the call fails for any reason,
// composeAIReading() returns null and the caller (app/api/reveal/route.js)
// falls back to a plain "try again" message — exactly like any other
// reveal failure already does.

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { TOPICS } from "@/lib/topics";
import { READINGS } from "@/lib/readings";
import { getReadingFor } from "@/lib/parseReading";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"; // fast + inexpensive — this only ever runs for the fallback path
const OPENAI_MODEL = "gpt-4o-mini"; // OpenAI's equivalent fast/cheap tier; swap here if you'd rather use a newer one
const GEMINI_MODEL = "gemini-2.5-flash"; // Google's equivalent fast/cheap tier

let anthropicClient = null;
let openaiClient = null;
let geminiClient = null;

// Picks whichever provider has a key configured. Anthropic wins if more
// than one is set — there's no meaningful quality reason for that, it's
// just a deterministic tie-break so behavior doesn't depend on load order.
function getProvider() {
  if (process.env.ANTHROPIC_API_KEY) {
    if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return { name: "anthropic", client: anthropicClient };
  }
  if (process.env.OPENAI_API_KEY) {
    if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return { name: "openai", client: openaiClient };
  }
  if (process.env.GEMINI_API_KEY) {
    if (!geminiClient) geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return { name: "gemini", client: geminiClient };
  }
  return null;
}

async function callAnthropic(client, userPrompt) {
  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  return message?.content?.find((b) => b.type === "text")?.text?.trim() || null;
}

async function callOpenAI(client, userPrompt) {
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: 500,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });
  return completion?.choices?.[0]?.message?.content?.trim() || null;
}

async function callGemini(client, userPrompt) {
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: 500,
    },
  });
  return response?.text?.trim() || null;
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

// Returns the finished reading text, or null on any failure (no key
// configured, network error, empty response) — never throws.
export async function composeAIReading({ card, question }) {
  const provider = getProvider();
  if (!provider || !card || !question) return null;

  try {
    const blocks = readingsForCard(card);
    const userPrompt = buildPrompt({ card, question, blocks });
    let text;
    if (provider.name === "anthropic") text = await callAnthropic(provider.client, userPrompt);
    else if (provider.name === "openai") text = await callOpenAI(provider.client, userPrompt);
    else text = await callGemini(provider.client, userPrompt);
    return text || null;
  } catch (err) {
    console.error(`composeAIReading failed (${provider.name}):`, err);
    return null;
  }
}
