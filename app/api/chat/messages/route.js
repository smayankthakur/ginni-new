import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { withRetry } from "@/lib/withRetry";

const HISTORY_LIMIT = 30;

// Saves one chat message for the logged-in user, then prunes anything
// beyond the most recent HISTORY_LIMIT for that user — so this table stays
// small by design instead of growing forever, per Mayank's call. Pick
// tokens are never stored here (they expire in 20 minutes); a "reveal"
// message's `text` already has the finished reading baked in by the time
// ChatPanel.jsx saves it, so replaying history later never needs a token.
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const { role, kind, text, card, aiMode } = await req.json().catch(() => ({}));
  const validRole = role === "user" || role === "ginni";
  const validKind = kind === "text" || kind === "reveal";
  if (!validRole || !validKind) {
    return NextResponse.json({ error: "Invalid message." }, { status: 400 });
  }

  try {
    const saved = await withRetry(() =>
      prisma.chatMessage.create({
        data: {
          userId: user.id,
          role,
          kind,
          text: text ? String(text).slice(0, 4000) : null,
          card: card ? String(card).slice(0, 100) : null,
          aiMode: !!aiMode,
        },
      })
    );

    const keepIds = (
      await withRetry(() =>
        prisma.chatMessage.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: HISTORY_LIMIT,
          select: { id: true },
        })
      )
    ).map((m) => m.id);

    await withRetry(() =>
      prisma.chatMessage.deleteMany({
        where: { userId: user.id, id: { notIn: keepIds } },
      })
    );

    return NextResponse.json({ id: saved.id });
  } catch (err) {
    console.error("Chat message save failed:", err);
    // Fail soft — this session's chat keeps working locally either way;
    // one message just doesn't make it into next time's history.
    return NextResponse.json({ id: null });
  }
}
