"use client";

import { useState } from "react";
import { cardSlug } from "@/lib/topics";

export default function TarotCard({ cardName, flipped, disabledOther, onPick, style }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = `/cards/${cardSlug(cardName)}.png`;

  return (
    <button
      className={
        "tarot-card spread-item" +
        (flipped ? " flipped" : "") +
        (disabledOther ? " picked-elsewhere" : "")
      }
      style={style}
      disabled={flipped || disabledOther}
      aria-label={flipped ? cardName : "Draw a card"}
      onClick={() => onPick(cardName)}
    >
      <span className="face back">
        <svg viewBox="0 0 40 60" fill="none" className="cardback-art">
          <rect x="2" y="2" width="36" height="56" rx="4" className="cardback-border" />
          <rect x="5" y="5" width="30" height="50" rx="3" className="cardback-inner" />
          <circle cx="20" cy="24" r="8" className="cardback-moon" />
          <circle cx="23" cy="22" r="7" className="cardback-moon-shadow" />
          <path d="M20 6 L20.9 8.2 L23.2 8.5 L21.5 10 L22 12.3 L20 11 L18 12.3 L18.5 10 L16.8 8.5 L19.1 8.2 Z" className="cardback-star" />
          <path d="M9 40 L9.5 41.3 L10.8 41.5 L9.8 42.3 L10.1 43.6 L9 42.9 L7.9 43.6 L8.2 42.3 L7.2 41.5 L8.5 41.3 Z" className="cardback-star" />
          <path d="M31 40 L31.5 41.3 L32.8 41.5 L31.8 42.3 L32.1 43.6 L31 42.9 L29.9 43.6 L30.2 42.3 L29.2 41.5 L30.5 41.3 Z" className="cardback-star" />
          <path d="M20 46 Q26 50 20 54 Q14 50 20 46 Z" className="cardback-glyph" />
        </svg>
      </span>
      <span className="face front">
        {flipped && !imgFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={cardName}
            className="card-art"
            onError={() => setImgFailed(true)}
          />
        )}
        {flipped && imgFailed && <span className="fn">{cardName}</span>}
      </span>
      {flipped &&
        Array.from({ length: 6 }).map((_, i) => <span key={i} className="spark" />)}
    </button>
  );
}
