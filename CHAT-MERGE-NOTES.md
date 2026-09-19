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
