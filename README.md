# Ginni Ki Baatein — Tarot Chat (Next.js)

A private tarot counsel web app, themed to match thedivinetarotonline.com:
email/password accounts, name + language onboarding, a mobile-friendly
chip-bar / sidebar menu of 15 questions, a real 78-card spread with official
card art, and readings pulled from the JSON source files in `/data` —
original entries are never rewritten, only appended to or added when a card
was genuinely missing.

3 readings are free per account; after that, a ₹199/month paywall unlocks
unlimited access via Razorpay. Access is enforced server-side against a
real database — see "Accounts & server-side enforcement" below for exactly
what that means and what it doesn't.

## Run locally

```bash
npm install                          # also runs `prisma generate`
cp .env.local.example .env.local     # then fill in DATABASE_URL, SESSION_SECRET, Razorpay keys
npx prisma migrate dev --name init   # creates the User/Order tables
npm run dev
```

Open http://localhost:3000. First run will ask you to create an account
(email + password) before showing the onboarding screen.

## Build for production

```bash
npm run build
npm run start
```

Make sure `DATABASE_URL`, `SESSION_SECRET`, `RAZORPAY_KEY_ID`, and
`RAZORPAY_KEY_SECRET` are set in your hosting provider's environment
variables (e.g. Vercel project settings) — `.env.local` is gitignored and
never gets deployed automatically. Run `npx prisma migrate deploy` against
your production database before the first deploy.

Optional: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, **or** `GEMINI_API_KEY` —
only needed if you want real per-question AI writing (see "AI fallback"
below). None of these are required, and leaving all three unset is the
recommended default for a free deployment: without a key, an unmatched
question still always gets a real reading, just from this app's own data
instead of an external call.

## AI fallback for unmatched/non-Hinglish questions

By default — **no AI provider key configured, which is the recommended
setup for a $0 deployment** — `lib/classify.js`'s free keyword matcher is
the only thing that runs for a typed question, and when it can't map one
to any of the 15 topics, `lib/localFallback.js` guarantees a real, relevant
reading anyway: it takes this app's own "Universe Message" reading for the
card that was drawn (broadly-applicable guidance, one of the 15 topics
already in your data) and wraps it with a line that echoes the seeker's
own question back to them. Zero API calls, zero cost, always available —
"the system must respond to every question" holds true with no external
service involved at all.

If you ever do want real per-question AI writing instead, set
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY` and it's used
automatically — `/api/reveal/route.js` tries AI first and only falls back
to the local reading above if no key is configured or the AI call itself
fails. Priority if more than one is set: Anthropic, then OpenAI, then
Gemini (`lib/ai.js`'s `getProvider()`). When AI is used, it's shown the
drawn card, the seeker's exact question, and all 13 of this app's own
existing readings for that card, and asked to translate whichever one
actually answers the question (staying faithful to it) or, only if none
fit, write an original reading — one API call either way. Language-
toggling the sidebar afterward is deliberately a no-op for an AI-generated
reading (`RevealCard.jsx`'s `aiMode` prop) — it already matches the
language the question was asked in, so re-running it would just spend
another call for a near-identical result. Known limitation: no caching, so
a page refresh mid-AI-reading calls the API again rather than replaying
the first result.

Pure small talk — "hi," "thanks," a greeting with nothing else in it — is
handled separately and before any of this: `isOffTopicChitchat()` in
`lib/classify.js` catches it, and Ginni replies in character with no card
drawn and no credit spent (see `CHITCHAT_REPLIES` in `ChatPanel.jsx`).
Anything with real content alongside a greeting ("hi, when will I get
married?") still gets a full reading — the check is deliberately
conservative so a genuine question is never brushed off.

## Chat history

The last ~30 messages per account are saved and reloaded on login
(`app/api/chat/history/route.js`, `app/api/chat/messages/route.js`) — kept
small on purpose rather than growing forever. A saved "reveal" message
stores the finished reading text directly, not the pick token (which
expires in 20 minutes) — `components/RevealCard.jsx`'s `resolvedText` prop
renders it with no re-fetch. Saving never blocks or errors the live chat:
if it fails, the conversation keeps working locally, that one message just
won't be there next time.

**Requires a new database table.** Run this once — Supabase dashboard →
SQL Editor → New query → paste and run:

```sql
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT,
    "card" TEXT,
    "aiMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

This is the same SQL as `prisma/migrations/20260921090000_add_chat_messages/migration.sql` — that file exists so `npx prisma migrate deploy` picks it up too if you ever run migrations that way instead.

## Error tracking (optional)

Set `SENTRY_DSN` (server errors) and/or `NEXT_PUBLIC_SENTRY_DSN` (browser
errors — same DSN value works for both, Sentry DSNs are safe to expose
client-side) to get real error reports instead of only Vercel's raw logs.
Sign up free at sentry.io, create a Next.js project, copy its DSN. Unset
by default — nothing about the build or runtime changes if you skip this.

Beyond Next.js's own automatic instrumentation (which has a known gap
under Turbopack for route handlers specifically — see
`sentry.server.config.js`'s comment), every catch block that's actually
been the source of a real bug in this app also calls
`Sentry.captureException()` explicitly: `lib/auth.js`'s `getSessionUser`,
both auth routes, `/api/reading/pick`, `/api/reveal`, both chat routes,
and the payment routes. That's deliberate — it's what would have turned
the pgbouncer/login investigation earlier in this project into a five-
minute Sentry lookup instead of many rounds of manually hunting through
Vercel's logs.

## Accounts & server-side enforcement

Every visitor now needs an account (email + password) before they can do
anything. This isn't just a login screen bolted on top — it's what makes
the paywall actually real:

- **Reading content never ships to the browser until it's been paid for or
  is within the free limit.** `lib/readings.js` (which imports every JSON
  file in `/data`) is only ever imported by server-side API routes
  (`app/api/reveal/route.js`) — no client component imports it anymore. A
  visitor's browser has no way to see interpretation text for a card they
  haven't picked and been authorized for, because it was never sent to
  them, not because it's merely hidden.
- **The free-reading count and subscription status live in the database**
  (`User.readingsUsed`, `User.subscriptionExpires`), keyed to the logged-in
  account — not in browser storage. Clearing cookies or switching devices
  doesn't reset anything; the same account still has the same usage.
- **The "charge" happens before content is served, not after.** Drawing a
  card calls `POST /api/reading/pick`, which checks access and — for
  free-tier users — increments `readingsUsed` in the database, *then*
  issues a short-lived signed token (`lib/auth.js: createPickToken`) that
  authorizes exactly that one card's reveal. `GET /api/reveal` only returns
  text if it receives a valid, unexpired token for that specific pick.
  Switching languages on an already-revealed card re-fetches with the same
  token (no re-charge); drawing a *new* card always goes through
  `/api/reading/pick` again, so the limit can't be bypassed by re-fetching.
- **Payments are verified server-side against a real database, tied to the
  logged-in user.** `/api/verify-payment` re-derives the Razorpay signature
  itself, confirms the order belongs to the current session's user, checks
  it hasn't already been credited, and only then extends
  `subscriptionExpires` — nothing about "is this user subscribed" is ever
  decided by trusting anything the client sends.

**What this still doesn't cover** (real, worth knowing before relying on
it):
- **No account recovery / "forgot password" flow yet.** If someone loses
  their password, there's currently no way for them to reset it — that's a
  straightforward addition (send a reset-token email) but isn't built.
- **No email verification.** Signup accepts any email address without
  confirming the person owns it.
- **"Monthly" is a 30-day unlock you pay for again, not true auto-recurring
  billing.** Real auto-debit (Razorpay Subscriptions API with UPI
  Autopay/eMandate) needs separate business KYC approval from Razorpay and
  more integration work.
- **Rate limiting isn't implemented.** Nothing currently stops someone from
  scripting repeated signups with throwaway emails to keep getting 3 fresh
  free readings. Real mitigation needs either email verification, phone
  verification, or IP/device-based rate limiting on `/api/auth/signup`.


## Structure

- `app/page.js` — top-level screen switcher (auth → onboarding → app)
- `app/layout.js` — fonts, global shell, Razorpay checkout script
- `app/globals.css` — all design tokens, styles, and animations
- `app/api/auth/signup/route.js`, `login/route.js`, `logout/route.js`,
  `me/route.js` — account creation, login, logout, and session check
- `app/api/reading/pick/route.js` — checks access, charges a free-tier
  credit if applicable, issues a one-time reveal token
- `app/api/reveal/route.js` — the only place reading text is ever read from
  `/data` and sent to a client, gated on a valid pick token
- `app/api/create-order/route.js` — creates a Razorpay order for the logged
  -in user (server-side)
- `app/api/verify-payment/route.js` — verifies a Razorpay payment signature
  and extends that user's subscription in the database
- `components/AuthGate.jsx` — login/signup screen shown before anything else
- `components/Onboarding.jsx` — name + language capture (after auth)
- `components/Sidebar.jsx` — desktop sidebar + mobile top bar/chip bar for
  the 15 questions, plus logout
- `components/ReadingPanel.jsx` — spread, draw (via `/api/reading/pick`),
  and paywall-gating logic
- `components/Paywall.jsx` — the ₹199/month upgrade screen + checkout flow
- `components/TarotCard.jsx` — the flippable card
- `components/RevealCard.jsx` — fetches and shows one revealed card's
  reading via `/api/reveal`
- `lib/topics.js` — the 78-card deck + the 15 topic definitions
- `lib/readings.js` — imports all 13 JSON reading files; **only imported by
  `app/api/reveal/route.js`**, never by client components
- `lib/parseReading.js` — language-aware parser for the raw reading text
- `lib/auth.js` — password hashing, session cookies, pick tokens
- `lib/db.js` — the shared Prisma client
- `prisma/schema.prisma` — `User` and `Order` table definitions
- `lib/ginni.js` — Ginni's greeting/closing voice lines
- `data/*.json` — the reading content itself, unmodified except where noted
  in chat history (a handful of genuinely missing cards/translations added)

## Payment module — ₹199/month after 3 free readings

**Setup:**
1. Create a Postgres database. Any host works (Neon, Vercel Postgres,
   Railway), but **if you're using Supabase**: go to Project Settings →
   Database → "Connect" (or "Connection string"). Supabase shows three
   tabs there — **Direct connection**, **Transaction pooler**, and
   **Session pooler**. Use only the pooler ones:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`
   - **Session pooler** (port 5432) → `DIRECT_URL`

   **Do not use "Direct connection"** (`db.<project-ref>.supabase.co`) for
   either variable, even though it's the first/most obvious option and
   also happens to use port 5432 — it's IPv6-only unless you've bought
   Supabase's IPv4 add-on, and Vercel's serverless functions only have
   IPv4 egress, so that host is simply unreachable from a Vercel
   deployment. This produces a `PrismaClientInitializationError: Can't
   reach database server` error that has nothing to do with your
   password, your schema, or your code — only the pooler hostnames work
   from Vercel.

   Also don't use the Project URL / anon key / service_role key shown
   elsewhere in that dashboard — those are for Supabase's separate REST
   API, which this app doesn't call at all.
2. Get API keys from your [Razorpay dashboard](https://dashboard.razorpay.com/app/keys)
   (start in test mode). The env var names must be exactly
   `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3. Copy `.env.local.example` to `.env.local` and fill in `DATABASE_URL`,
   `DIRECT_URL`, `SESSION_SECRET` (any long random string — e.g.
   `openssl rand -base64 32`), and the two Razorpay keys.
4. Run `npx prisma migrate dev --name init` to create the tables.
5. Add all five variables in your hosting provider's environment variable
   settings before deploying — `.env.local` is gitignored and never gets
   deployed automatically. Run `npx prisma migrate deploy` against the
   production database too (this uses `DIRECT_URL`).
6. Test with [Razorpay's test cards](https://razorpay.com/docs/payments/payments/test-card-details/)
   before switching to live keys.

**If you ever paste a real secret (API key, database password) into a chat,
treat it as compromised — rotate/regenerate it from the provider's
dashboard afterward, even if the conversation is private.**

**How it works:** see "Accounts & server-side enforcement" above — the
short version is that access is checked and charged in the database before
any reading content is served, and payments are verified server-side before
a subscription is granted. The two honest limitations (30-day unlock
instead of true auto-billing, and no rate limiting on signups yet) are also
listed there.

### Referrals — 3 free readings for both sides

Every account gets a unique `referralCode` (generated at signup,
`lib/referral.js`) and a shareable link in the form `yoursite.com/?ref=CODE`
— visible via "Invite a friend" in the sidebar (`InviteModal.jsx`). When
someone signs up through that link, their `referredByUserId` is recorded
(`app/api/auth/signup/route.js`); an unrecognized or missing code is never
an error, signup just proceeds without crediting anyone.

The reward — `REFERRAL_BONUS_READINGS` (3, `lib/auth.js`) for **both** the
referrer and the new subscriber — is only granted once, at the moment the
referred friend's *first* subscription payment is verified
(`app/api/verify-payment/route.js`), guarded by a `referralRewarded` flag so
it can never fire again on a renewal. Signing up alone doesn't trigger
anything — matching "when a friend... subscribes," not just registers.

`bonusReadings` adds on top of the normal 3-free-reading limit rather than
resetting it (`lib/auth.js`'s `summarizeAccess`, and the same check in
`/api/reading/pick`), so it stacks cleanly across multiple referrals and
never interferes with a user's actual usage count.

## Language parsing

`lib/parseReading.js` recognises every language-label style found across the
original 13 source files — inline colon labels (`Hinglish:`, `English:`,
`HINDI:`, `Devanagari Hinglish:`, common misspellings like
`Hinid:`/`HINDIN:`), and whole-line labels with no colon (`ENGLISH`,
`हिंदी`, etc.). For a handful of cards that stacked all three languages
back-to-back with no labels at all, it splits them by detecting Devanagari
vs. Latin script rather than relying on wording. As of that content pass,
every card in every one of those 15 questions resolves to real text in all
three languages — verified by running the parser against every file, not
by inspection. The newer 16th topic, Career (`data/career_guidance.json`),
is Hinglish-only for now — it uses the same graceful single-language
fallback several original cards already relied on (see
`SINGLE_LANG_NOTE` in `RevealCard.jsx`), rather than a special case.

## AI fallback for unmatched/non-Hinglish questions

`lib/classify.js`'s free keyword matcher is the first and only pass for
anything typed in Hinglish/English/Hindi that maps cleanly to one of the 16
topics — no AI, no cost. It only hands off further in two cases: the
question doesn't match any of the 15 topics' keyword rules, or
`looksNonLatinScript()` flags the text as mostly outside the Latin-alphabet
range. See the "AI fallback" section near the top of this file for what
happens next — by default that's the free local reading, not AI.

## Spread & draw behaviour

- The full 78-card deck is shown, reshuffled on every topic open and on
  every "Draw again." Cards fade in with a staggered, scattered-spread
  entrance animation.
- Picking a card flips it in place with a glow-pulse and grow animation,
  then reveals its real card art alongside the reading.
- All animation respects `prefers-reduced-motion: reduce`.

## Card art

`public/cards/` has all 78 official card images (from the same source as
the parent site's live deck), named to match `cardSlug()` in `lib/topics.js`
(e.g. `the-fool.png`). `RevealCard.jsx` and `TarotCard.jsx` show the
matching image, with a plain-text fallback if a specific file is ever
missing.

## Site header & footer

`components/SiteHeader.jsx` and `components/SiteFooter.jsx` are the global
brand chrome, matched to thedivinetarotonline.com's own header/footer
(same nav items, same "Ask your question here" CTA, same footer columns,
socials, newsletter form, and trust row — colors pulled from the live
site's own footer source).

They wrap **every screen** — login, onboarding, and the active reading
session — via the `.site-page` wrapper in `app/page.js`. Since `SiteHeader`
is sticky and the reading app's own `Sidebar`/`#app` grid was originally
built to fill the full viewport on its own, `globals.css` has a matching
`.site-page #app` / `.site-page .sidebar` override that subtracts the
header's height (`--site-header-h`, 80px) so the app still fits exactly
below it instead of overflowing by 80px. The same subtraction is applied
to the app's own mobile sticky bars (`.mobile-topbar`, `.chip-bar`,
`.mobile-settings-panel`), which otherwise assumed they were the topmost
thing on the page. `SiteFooter` sits below the app in normal document
flow — reachable by scrolling past the reading screen, not squeezed into
the viewport with it.

Worth knowing: on narrow screens this now stacks `SiteHeader`'s own
compact bar (logo + hamburger) directly above `Sidebar`'s mobile bar
(logo + "Ginni Ki Baatein" + settings), so there are two brand rows before
the reading content on mobile. Nothing overlaps, but if that reads as too
much chrome, the fix is either hiding `SiteHeader` specifically on the
active-session screen again (revert to wrapping only `AuthGate`/
`Onboarding`) or trimming `Sidebar`'s own mobile bar down to just the
settings control once `SiteHeader` is always present.

Since this app lives on its own subdomain, every nav item that isn't
Reading, Course, or Personal Reading (each already a separate subdomain)
resolves back to `https://thedivinetarotonline.com/...` rather than
routing inside this app — there's no local `/about`, `/kundli-milan`, or
`/privacy` page here. Change `MAIN_SITE`/`READING_SITE` at the top of
either component if those domains ever change.

The footer's "Get Daily Divine Insights" form posts to `app/api/subscribe`,
which upserts into a new `NewsletterSubscriber` table. Run this once after
pulling these changes:

```bash
npx prisma migrate dev --name add_newsletter_subscriber
```

## Mobile layout

Under 820px, the sidebar becomes a sticky top bar plus a horizontally
scrollable chip bar listing all 15 questions — nothing is hidden behind a
hamburger menu. The "choose a question" empty state also renders the full
question list as tappable cards, so it's visible without relying on the
chip bar alone. Language switching and "start over" live behind a small
avatar-icon popover in the top-right, since those are secondary controls.
