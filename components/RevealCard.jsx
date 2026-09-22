"use client";

import { useState, useEffect, useRef } from "react";
import { cardSlug, cardEmoji, UNAVAILABLE_MESSAGE } from "@/lib/topics";

const SINGLE_LANG_NOTE = {
  hinglish: "Yeh reading abhi sirf Hinglish mein hi likhi gayi hai — jald hi baaki languages mein bhi aayegi 💜",
  english: "This one's currently written in Hinglish only in the source — an English version isn't ready yet, so it's shown as-is.",
  hindi: "यह रीडिंग अभी सिर्फ हिंग्लिश में लिखी गई है — हिंदी वर्शन जल्द आएगा।",
};

export default function RevealCard({ pick, pickToken, lang, monthLabel, aiMode, resolvedText, onResolved }) {
  const [imgFailed, setImgFailed] = useState(false);
  // Loaded-from-history messages arrive with resolvedText already set —
  // render immediately, no fetch, no token needed (the pick token behind a
  // saved message has long since expired by the time it's reloaded).
  const [state, setState] = useState(() =>
    resolvedText
      ? { loading: false, text: resolvedText, available: true, singleLanguageSource: false }
      : { loading: true, text: null, available: false, singleLanguageSource: false }
  );
  const src = `/cards/${cardSlug(pick.card)}.png`;
  // AI-generated readings already match the seeker's own question language
  // — that's the actual point of them — so a later lang-toggle click
  // shouldn't re-run the AI just to produce a near-identical result at
  // another cost. This remembers which token we've already fetched for and
  // skips re-fetching in that one case; every normal (non-AI) reveal still
  // re-fetches on every lang change exactly as before.
  const fetchedForRef = useRef(resolvedText ? pickToken : null);

  useEffect(() => {
    if (resolvedText) return; // already-resolved history — nothing to fetch, ever
    if (aiMode && fetchedForRef.current === pickToken) return;

    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    const url = aiMode
      ? `/api/reveal?token=${encodeURIComponent(pickToken)}`
      : `/api/reveal?token=${encodeURIComponent(pickToken)}&lang=${encodeURIComponent(lang)}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        fetchedForRef.current = pickToken;
        setState({
          loading: false,
          text: data.text,
          available: !!data.available,
          singleLanguageSource: !!data.singleLanguageSource,
        });
        if (data.available && data.text) onResolved?.(data.text);
      })
      .catch(() => {
        if (cancelled) return;
        setState({ loading: false, text: null, available: false, singleLanguageSource: false });
      });

    return () => {
      cancelled = true;
    };
    // Re-fetches when the language toggle changes — same token, so this
    // never spends another credit, it just asks for a different translation
    // of the same already-paid-for reveal. (Skipped for AI mode and for
    // already-resolved history — see the guards above.)
  }, [pickToken, lang, aiMode, resolvedText, onResolved]);

  return (
    <div className="month-entry">
      <div className="reveal-frame">
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={pick.card} onError={() => setImgFailed(true)} />
        ) : (
          <span className="reveal-frame-fallback">{pick.card}</span>
        )}
        <span className="reveal-badge">{cardEmoji(pick.card)}</span>
      </div>
      <div className="reveal-body">
        <div className="reveal-card-name">
          <span className="card-label">{pick.card}</span>
          {monthLabel && <span className="month-tag">{monthLabel}</span>}
        </div>
        {state.loading ? (
          <p className="reveal-text unavailable">Reading the card…</p>
        ) : state.available ? (
          <p className="reveal-text">
            {state.text}
            {state.singleLanguageSource && lang !== "hinglish" && (
              <span className="note">{SINGLE_LANG_NOTE[lang]}</span>
            )}
          </p>
        ) : (
          <p className="reveal-text unavailable">{UNAVAILABLE_MESSAGE[lang]}</p>
        )}
      </div>
    </div>
  );
}
