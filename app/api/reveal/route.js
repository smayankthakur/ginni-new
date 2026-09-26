import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { verifyPickToken } from "@/lib/auth";
import { TOPICS, UNAVAILABLE_MESSAGE } from "@/lib/topics";
import { READINGS } from "@/lib/readings";
import { getReadingFor } from "@/lib/parseReading";
import { composeAIReading } from "@/lib/ai";
import { composeLocalReading } from "@/lib/localFallback";

// This is the only route that ever touches lib/readings.js — that file (and
// everything in /data) is never imported by client components anymore, so
// none of it ships in the JS bundle. A visitor who hasn't picked (and paid
// for, past the free limit) a specific card has no way to see its text.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const lang = searchParams.get("lang") || "hinglish";

  const payload = token && verifyPickToken(token);
  if (!payload) {
    return NextResponse.json({ error: "This reveal link is invalid or expired." }, { status: 401 });
  }

  try {
    // Fallback path: the client's free classifier (lib/classify.js)
    // couldn't map this question to any of the 15 topics. Real AI
    // (lib/ai.js) is tried first, but only if a provider key is actually
    // configured — by default, none is, and composeAIReading() returns
    // null immediately without making any call. Either way, this always
    // ends in a real reading via lib/localFallback.js: "system must
    // respond to every question" holds even on a $0 deployment with no AI
    // key at all. `lang` is only used by the local path (it picks the
    // seeker's session language) — an AI reading already matches whatever
    // language the question was asked in, so re-running it on every
    // sidebar language toggle would just spend another call for nothing.
    if (payload.topicId === "ai") {
      const aiText = await composeAIReading({ card: payload.card, question: payload.question });
      if (aiText) {
        return NextResponse.json({ available: true, text: aiText, aiGenerated: true, singleLanguageSource: null, fallbackMessage: null });
      }

      const localText = composeLocalReading({ card: payload.card, question: payload.question, lang });
      if (localText) {
        return NextResponse.json({ available: true, text: localText, aiGenerated: false, localFallback: true, singleLanguageSource: null, fallbackMessage: null });
      }

      // Only reachable if even the Universe Message file were missing text
      // for this card — verified elsewhere that it never is, but this is
      // the honest last resort rather than a crash.
      return NextResponse.json({ available: false, text: null, fallbackMessage: UNAVAILABLE_MESSAGE[lang] || UNAVAILABLE_MESSAGE.hinglish });
    }

    const topic = TOPICS.find((t) => t.id === payload.topicId);
    if (!topic) {
      return NextResponse.json({ error: "Unknown question." }, { status: 400 });
    }

    const raw = READINGS[topic.dataKey]?.[payload.card];
    if (!raw) {
      return NextResponse.json({ available: false, text: null });
    }

    const { text, available, singleLanguageSource } = getReadingFor(raw, lang);
    return NextResponse.json({
      available,
      text: available ? text : null,
      singleLanguageSource,
      fallbackMessage: available ? null : UNAVAILABLE_MESSAGE[lang],
    });
  } catch (err) {
    console.error("Reveal failed:", err);
    Sentry.captureException(err, { tags: { area: "reveal" } });
    return NextResponse.json({ error: "Couldn't load this reading right now." }, { status: 500 });
  }
}
