import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { withRetry } from "@/lib/withRetry";

const HISTORY_LIMIT = 30;

// Returns the most recent HISTORY_LIMIT messages for the logged-in user,
// oldest first (chronological, ready to render directly). See
// app/api/chat/messages/route.js for how they're saved and pruned.
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  try {
    const recent = await withRetry(() =>
      prisma.chatMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: HISTORY_LIMIT,
      })
    );
    return NextResponse.json({ messages: recent.reverse() });
  } catch (err) {
    console.error("Chat history load failed:", err);
    Sentry.captureException(err, { tags: { area: "chat-history" } });
    // Fail soft — an empty history (just today's fresh chat) beats blocking
    // the whole app from loading because of one flaky query.
    return NextResponse.json({ messages: [] });
  }
}
