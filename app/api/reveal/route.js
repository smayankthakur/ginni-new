import { NextResponse } from "next/server";
import { verifyPickToken } from "@/lib/auth";
import { TOPICS, UNAVAILABLE_MESSAGE } from "@/lib/topics";
import { READINGS } from "@/lib/readings";
import { getReadingFor } from "@/lib/parseReading";
import { composeAIReading } from "@/lib/ai";

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
    // AI fallback path: the client's free classifier (lib/classify.js)
    // couldn't map this question to any of the 15 topics, or it wasn't
    // typed in Hinglish/English/Hindi at all. lib/ai.js takes it from here
    // — see that file for exactly what it's given and asked to do. `lang`
    // is ignored here on purpose: the AI reading already matches whatever
    // language the seeker's own question was in, which is the actual goal,
    // and re-running it on every sidebar language toggle would just spend
    // another AI call for no benefit.
    if (payload.topicId === "ai") {
      const text = await composeAIReading({ card: payload.card, question: payload.question });
      if (!text) {
        return NextResponse.json({ available: false, text: null, fallbackMessage: UNAVAILABLE_MESSAGE[lang] || UNAVAILABLE_MESSAGE.hinglish });
      }
      return NextResponse.json({ available: true, text, aiGenerated: true, singleLanguageSource: null, fallbackMessage: null });
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
    return NextResponse.json({ error: "Couldn't load this reading right now." }, { status: 500 });
  }
}
