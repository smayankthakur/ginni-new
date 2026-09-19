"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { DECK, MONTH_NAMES, TOPICS } from "@/lib/topics";
import { shuffle } from "@/lib/parseReading";
import { getGreeting, getClosing } from "@/lib/ginni";
import TarotCard from "./TarotCard";
import RevealCard from "./RevealCard";
import Paywall from "./Paywall";

// `access` comes from the parent (fetched server-side via /api/auth/me) and
// `onAccessChange` lets this component push a freshly-updated access summary
// back up after a pick or a payment, without a full page refetch.
export default function ReadingPanel({ topic, lang, name, onSelectTopic, onAnotherQuestion, access, onAccessChange }) {
  const [picks, setPicks] = useState([]); // [{card, monthIndex, pickToken}]
  const [flippingCard, setFlippingCard] = useState(null);
  const [drawSeed, setDrawSeed] = useState(0);
  const [pickError, setPickError] = useState(null);
  const [blocked, setBlocked] = useState(false); // true once the server has said "limit reached" for this topic session
  const revealEndRef = useRef(null);

  useEffect(() => {
    setPicks([]);
    setBlocked(false);
    setPickError(null);
  }, [topic, drawSeed]);

  // Always spread the full 78-card deck, freshly shuffled per topic/redraw.
  const spreadCards = useMemo(() => {
    if (!topic) return [];
    return shuffle(DECK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, drawSeed]);

  useEffect(() => {
    if (revealEndRef.current) {
      revealEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [picks.length]);

  if (!topic) {
    const freeLeft = access?.freeLeft ?? 0;
    return (
      <div className="state-empty">
        <svg className="glyph-big" viewBox="0 0 46 46" fill="none">
          <circle cx="23" cy="23" r="21" stroke="#9C97C2" strokeWidth="1" />
          <path
            d="M23 12 L25.5 20.5 L34 23 L25.5 25.5 L23 34 L20.5 25.5 L12 23 L20.5 20.5 Z"
            fill="#9C97C2"
            opacity="0.6"
          />
        </svg>
        <h2>Choose a question to begin</h2>
        <p>I&rsquo;ll lay out a spread — draw the card that draws you.</p>
        {!access?.subscribed && (
          <p className="free-count-note">
            {freeLeft > 0
              ? `${freeLeft} free reading${freeLeft === 1 ? "" : "s"} left`
              : "Free readings used — subscribe for unlimited access"}
          </p>
        )}

        <div className="question-grid">
          {TOPICS.map((t) => (
            <button key={t.id} className="question-card" onClick={() => onSelectTopic?.(t)}>
              <span className="question-card-num">{String(t.id).padStart(2, "0")}</span>
              <span className="question-card-title">{t.title}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const total = topic.cards;
  const doneCount = picks.length;

  if (blocked && doneCount === 0) {
    return (
      <Paywall
        name={name}
        onUnlocked={(newAccess) => {
          setBlocked(false);
          onAccessChange?.(newAccess);
        }}
      />
    );
  }

  // For a single-card topic, reveal right after the pick. For a multi-card
  // topic (the 12-month spread), hold every reading back until all cards
  // are drawn, then show the full spread of readings together.
  const showReveal = total === 1 ? doneCount > 0 : doneCount === total;
  // Cards still face-down in the spread — this excludes only cards already
  // fully picked (in `picks`), not the one currently mid-flip, so that card
  // keeps the same key/position and grows in place instead of jumping.
  const visibleSpread = spreadCards.filter((c) => !picks.some((p) => p.card === c));

  async function handlePick(cardName) {
    if (flippingCard) return;
    setPickError(null);
    setFlippingCard(cardName);

    // Access is checked and (for free-tier users) charged server-side,
    // *before* any reading content is requested — this is the real
    // enforcement point, not just a UI gate.
    let pickToken;
    try {
      const res = await fetch("/api/reading/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id, card: cardName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFlippingCard(null);
        if (data.error === "limit_reached") {
          onAccessChange?.(data);
          setBlocked(true);
        } else {
          setPickError(data.error || "Something went wrong — try again.");
        }
        return;
      }
      pickToken = data.pickToken;
      onAccessChange?.(data.access);
    } catch {
      setFlippingCard(null);
      setPickError("Couldn't reach the server — check your connection and try again.");
      return;
    }

    setTimeout(() => {
      setPicks((prev) => [...prev, { card: cardName, monthIndex: prev.length + 1, pickToken }]);
      setFlippingCard(null);
    }, 620);
  }

  return (
    <>
      <div className="reading-header">
        <div className="eyebrow topic-eyebrow">QUESTION {String(topic.id).padStart(2, "0")}</div>
        <h2>{topic.title}</h2>
        <p className="prompt">{topic.prompt}</p>
      </div>

      {pickError && (
        <p className="prompt" style={{ color: "var(--rose)" }}>
          {pickError}
        </p>
      )}

      {doneCount === 0 && (
        <p className="ginni-msg">
          <span className="ginni-mark">✦</span>
          {getGreeting(name, lang, topic, drawSeed)}
        </p>
      )}

      {total > 1 && (
        <div className="progress-track">
          {Array.from({ length: total }, (_, i) => {
            const cls = i < doneCount ? "done" : i === doneCount ? "current" : "";
            return (
              <span key={i} className={"progress-dot " + cls} title={MONTH_NAMES[i]}>
                {i < doneCount ? "✓" : i + 1}
              </span>
            );
          })}
        </div>
      )}

      {doneCount < total && (
        <>
          {total > 1 && (
            <p className="spread-hint" style={{ marginTop: 0 }}>
              Drawing for <b style={{ color: "var(--gold-soft)" }}>{MONTH_NAMES[doneCount]}</b> —
              card {doneCount + 1} of {total}.
            </p>
          )}
          <div className="spread" key={topic.id + "-" + drawSeed}>
            {visibleSpread.map((c, i) => (
              <TarotCard
                key={c}
                cardName={c}
                flipped={c === flippingCard}
                disabledOther={!!flippingCard && c !== flippingCard}
                onPick={handlePick}
                style={c === flippingCard ? undefined : { animationDelay: `${Math.min(i * 9, 550)}ms` }}
              />
            ))}
          </div>
          <p className="spread-hint">
            {total > 1
              ? `✨ 78 cards, freshly shuffled. ${doneCount} of ${total} picked — keep going.`
              : "✨ 78 cards, freshly shuffled. Tap the one that calls to you."}
          </p>
        </>
      )}

      {showReveal && (
        <div className="reveal">
          <div className="reveal-divider">
            <span>✨ Card Ka Message</span>
          </div>
          {picks.map((pick) => {
            const monthLabel = total > 1 ? MONTH_NAMES[pick.monthIndex - 1] : null;
            return (
              <RevealCard
                key={pick.card + pick.monthIndex}
                pick={pick}
                pickToken={pick.pickToken}
                lang={lang}
                monthLabel={monthLabel}
              />
            );
          })}

          <p className="ginni-msg ginni-msg--closing">
            <span className="ginni-mark">✦</span>
            {getClosing(name, lang, drawSeed)}
          </p>

          <div ref={revealEndRef} />
        </div>
      )}

      {doneCount === total && total > 0 && (
        <div className="actions-row">
          <button
            className="btn-ghost"
            onClick={() => {
              setPicks([]);
              setDrawSeed((s) => s + 1);
            }}
          >
            Draw again
          </button>
          <button className="btn-ghost" onClick={onAnotherQuestion}>
            Ask another question
          </button>
        </div>
      )}
    </>
  );
}
