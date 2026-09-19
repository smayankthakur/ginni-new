"use client";

import { useState, useEffect } from "react";
import { cardSlug, cardEmoji, UNAVAILABLE_MESSAGE } from "@/lib/topics";

const SINGLE_LANG_NOTE = {
  hinglish: "Yeh reading abhi sirf Hinglish mein hi likhi gayi hai — jald hi baaki languages mein bhi aayegi 💜",
  english: "This one's currently written in Hinglish only in the source — an English version isn't ready yet, so it's shown as-is.",
  hindi: "यह रीडिंग अभी सिर्फ हिंग्लिश में लिखी गई है — हिंदी वर्शन जल्द आएगा।",
};

export default function RevealCard({ pick, pickToken, lang, monthLabel }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [state, setState] = useState({ loading: true, text: null, available: false, singleLanguageSource: false });
  const src = `/cards/${cardSlug(pick.card)}.png`;

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    fetch(`/api/reveal?token=${encodeURIComponent(pickToken)}&lang=${encodeURIComponent(lang)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          text: data.text,
          available: !!data.available,
          singleLanguageSource: !!data.singleLanguageSource,
        });
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
    // of the same already-paid-for reveal.
  }, [pickToken, lang]);

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
