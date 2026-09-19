import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, summarizeAccess, createPickToken } from "@/lib/auth";
import { TOPICS } from "@/lib/topics";

// Drawing a card is the "spend a credit" moment — charged here, before any
// reading text is ever sent to the client. Language switches on an already
// -picked card reuse the token this returns instead of hitting this route
// again, so they never re-charge.
export async function POST(req) {
  if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
    return NextResponse.json(
      { error: "Server isn't configured yet. Contact the site owner." },
      { status: 500 }
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const { topicId, card } = await req.json().catch(() => ({}));
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic || !card) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const subscribed = !!(user.subscriptionExpires && new Date(user.subscriptionExpires) > new Date());
    const hasAccess = subscribed || user.readingsUsed < 3;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "limit_reached", ...summarizeAccess(user) },
        { status: 403 }
      );
    }

    // Only spend a credit for readers on the free tier — subscribers don't
    // need their usage counted at all.
    const updated = subscribed
      ? user
      : await prisma.user.update({
          where: { id: user.id },
          data: { readingsUsed: { increment: 1 } },
        });

    const pickToken = createPickToken({ userId: user.id, topicId: topic.id, card });

    return NextResponse.json({
      allowed: true,
      pickToken,
      access: summarizeAccess(updated),
    });
  } catch (err) {
    console.error("Pick failed:", err);
    return NextResponse.json({ error: "Couldn't draw a card right now. Please try again." }, { status: 500 });
  }
}
