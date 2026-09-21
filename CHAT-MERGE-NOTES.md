# Ginni Ki Baatein — Chat UI merge notes

This is `ginni2-updated-main` (your production Next.js app — real login,
server-enforced 3-free/₹199-month paywall, Razorpay, Postgres) with the
chat-style question-and-answer experience from `tdt-ginni-main` grafted on.
**Nothing about auth, the database, or payments was touched.**

## What you get

- **Left**: the same sidebar you already had (`components/Sidebar.jsx`,
  untouched) — the fixed list of all 15 questions.
- **Right**: a real chat thread. Type a question, or click one on the left —
  either way it's understood the same way, a card gets drawn inline in the
  conversation, and Ginni's reading appears as her reply.
- Understanding a typed/clicked question uses a fast keyword/regex matcher
  (no AI, ₹0 cost, instant) — see "The understanding layer" below.

## Files added

- `lib/classify.js` — the "understanding" layer. `classifyQuestion(text)`
  returns one of the 15 topic ids from `lib/topics.js`. Every one of the 15
  sidebar questions round-trips to its own id (verified — see below); free
  text is matched by keyword/pattern, same style as tdt-ginni-main's
  `readingEngine.js`, just remapped onto this app's exact topic ids.
- `components/ChatPanel.jsx` — the chat thread: message list, the inline
  "draw a card" step (reuses `TarotCard.jsx` exactly as `ReadingPanel.jsx`
  already did), the revealed reading (reuses `RevealCard.jsx` **unmodified**
  — it already fetches from `/api/reveal` by token, so it dropped in as-is),
  the composer, and a paywall modal (reuses `Paywall.jsx` unmodified).

## Files changed

- `app/page.js` — renders `ChatPanel` instead of `ReadingPanel` once a
  session exists. Clicking a sidebar question now fills the chat input with
  its exact title and sends it, instead of jumping straight to a topic
  screen — so a click and a typed question always go through the same
  `classifyQuestion()` step, per your call.
- `app/globals.css` — appended chat-specific rules only (bubbles, composer,
  paywall modal). Nothing existing was edited or removed.

## Files left alone (still in the repo, just unused for now)

- `components/ReadingPanel.jsx` — your original card-spread-per-topic
  screen. Not deleted, just not wired into `page.js` anymore, in case you
  ever want to switch back or compare.
- Every API route, `lib/auth.js`, `lib/db.js`, `prisma/`, `lib/access.js`,
  `lib/readings.js`, `lib/parseReading.js`, `lib/ginni.js` — all untouched.
  The paywall is still enforced exactly where it always was: server-side, in
  `/api/reading/pick`.

## The understanding layer, and its known limits

`classifyQuestion()` is deterministic keyword matching, not real NLU — the
same trade-off tdt-ginni-main already made. It will occasionally miss an
oddly-phrased question and fall back to "Universe Message" rather than the
intended topic. If that happens often enough to bother users, the fix is
either widening the patterns in `lib/classify.js`, or swapping this file for
a real LLM call later (nothing else in the app needs to change — everything
downstream just expects a topic id back).

## What I verified here (and what I couldn't)

- `npx eslint .` — zero errors/warnings on every new or changed file.
- `npx next build` compiles successfully (webpack/SWC + TypeScript pass).
  It then fails at the "Collecting page data" step — but that failure is
  `@prisma/client did not initialize`, because this sandbox can't reach
  `binaries.prisma.sh` to download the Prisma engine. **I confirmed the
  exact same failure happens on your original, completely unmodified
  ginni2-updated-main in this sandbox** — it's a network restriction here,
  unrelated to anything in this merge. Run `npm install` (or just
  `npx prisma generate`) on your own machine or in your normal deploy
  pipeline and the build will complete normally.
- I hand-verified all 15 sidebar questions classify back to their own topic
  via a small Node script — 15/15 passed.
- I have not run this in an actual browser (no DATABASE_URL/SESSION_SECRET
  in this sandbox to log in with), so give the chat flow a real click-through
  once it's running with your env vars.

## One thing worth deciding later

The card-draw ritual (tap a face-down card from a shuffled spread) is kept
exactly as both source apps had it, rendered inline in the chat. If you'd
rather skip straight from "question" to "answer" with no card-tap step, say
so and I'll simplify it — that's a small change, not a rebuild.

---

## Update: full-screen card draw + reference-matched background

Two follow-up fixes, based on what you reported after the SESSION_SECRET fix:

**"No reading" after selecting a question.** The data/mapping itself checked
out perfectly (verified all 15 questions → correct file → all 78 cards → all
3 languages, zero gaps). The actual problem was almost certainly the UI: the
first version crammed all 78 cards into a *wrapping grid inside a chat
bubble*, which on a real screen could easily overflow or clip so badly that
there was nothing tappable — which would look exactly like "select a
question, get nothing back."

**Fix:** the card draw now happens in a **full-screen overlay**
(`components/DrawOverlay.jsx`), with the cards fanned in a single
horizontally-scrollable row — this is the actual pattern
chat.thedivinetarotonline.com (your `tdt-ginni-main` app, deployed at
`tdt-ginni-1.vercel.app`) already uses, not something new. I pulled it
straight from that app's `CardPicker.jsx` rather than reinventing it. This
also directly answers "make sure this must get within the screen" — a
single scrollable row can't overflow the viewport the way a multi-row grid
crammed into a bubble could.

**Reading background.** Pulled the actual design tokens from that same
`tdt-ginni-main` source (`app/src/index.css`) — a warm gold/amber cosmic
glow on near-black, quite different from this app's own violet theme.
Applied it to the chat panel specifically (background, message bubbles, and
the new draw overlay), since that's "the reading" — I left the sidebar,
header, and footer in their existing violet branding, since you only asked
about the reading background and those are more the site's persistent
navigation. Say the word if you want the violet gone everywhere instead.

Files touched this round: `components/DrawOverlay.jsx` (new),
`components/ChatPanel.jsx` (draw logic moved out of the message thread into
the overlay), `app/globals.css` (new palette + overlay styles). Nothing
about auth, the database, payments, or the reading data itself changed.

Re-verified: `eslint` clean on every new/changed file, `next build`
compiles successfully (same pre-existing Prisma-engine sandbox limit as
before, confirmed unrelated to this change).

---

## Update: AI fallback for unmatched/non-Hinglish questions

Per your call: the free keyword matcher (`lib/classify.js`) stays the first
and only pass for Hinglish/English/Hindi — zero cost, unchanged. AI
(`lib/ai.js`, new) only runs when that matcher can't map the question, or
the text isn't in a script it was ever built to read (Devanagari, Tamil,
Arabic, etc. all trigger it now via the new `looksNonLatinScript()` check).
Greetings and closings are untouched, per your second answer.

**What actually happens on the AI path:** the card is still drawn exactly
as before. At reveal time, Claude is shown the drawn card, the seeker's
real question, and *all 13 of your own existing readings for that exact
card* — then asked to translate whichever one actually answers the question
into the seeker's language (staying faithful to it), or, only if none of
them fit, write an original reading itself in Ginni's voice. One API call,
not two. Full detail in the README's new "AI fallback" section.

**New requirement:** `ANTHROPIC_API_KEY`, from console.anthropic.com. The
app runs fine without it — that one feature just shows a "try again"
message until it's set, exactly like any other reveal failure.

**Files touched:** `lib/ai.js` (new), `lib/classify.js` (now returns `null`
on no match instead of silently defaulting, plus the new script-detection
helper), `lib/auth.js` (pick tokens can now carry the raw question),
`app/api/reading/pick/route.js` and `app/api/reveal/route.js` (both accept
and branch on a new `"ai"` sentinel topicId), `components/ChatPanel.jsx`
(decides when to use it), `components/RevealCard.jsx` (added an `aiMode`
prop so a language-toggle click doesn't waste a second AI call on an
already-AI-generated reading). Nothing about auth, the database, payments,
or the existing 15-topic static reading path changed.

Re-verified: `eslint` clean on every new/changed file; `next build`
compiles (same pre-existing Prisma sandbox limit, unrelated); manually
re-confirmed all 15 questions still round-trip through the classifier, and
separately confirmed the per-card reference-reading lookup returns all 13
expected blocks with real text. I could not test an actual live Anthropic
API call end-to-end from here — I don't have a key to test with — so the
first real run is worth watching once `ANTHROPIC_API_KEY` is set.
---

## Update: automatic retry for the intermittent "Please log in first" error

Your screenshots showed something important: the *same* action (asking
"Aapke Rishte Ka Past, Present Aur Future" twice in a row) succeeded once
and failed once, back to back, in the same session — not a permanent
break, an intermittent one. That's the signature of Supabase's pooled
connection occasionally handing Prisma a connection with another request's
leftover state on it (Postgres error 26000, "prepared statement does not
exist") — a known PgBouncer/Prisma interaction that `?pgbouncer=true`
reduces but doesn't always fully eliminate under real traffic.

Rather than keep tuning the connection string blind, `lib/withRetry.js`
(new) now wraps every database call in the login, signup, and
session-check path (`lib/auth.js`'s `getSessionUser`, both auth routes,
and the credit-charging update in `/api/reading/pick`) so that — and only
that — specific, well-understood transient error is retried automatically
(up to twice, with a short backoff) before it's ever shown to a user. A
real error — wrong password, a genuinely unreachable database — still
fails immediately, unchanged; this only catches the one error signature
that's shown up in your logs.

Verified with a standalone test: retries and succeeds when the transient
error clears within 2 attempts, does not retry a real (non-transient)
error at all, and correctly gives up and throws after exhausting retries
if the transient error never clears. `eslint` and `next build` both clean
on every new/changed file (same pre-existing, unrelated Prisma-engine
sandbox limit as always on the build step).

This isn't a substitute for confirming the actual `DATABASE_URL`
"Needs Attention" flag's cause — it just means you shouldn't see this
particular error reach the screen anymore while that's still being tracked
down.
