"use client";

import { useEffect, useState } from "react";
import TarotCard from "./TarotCard";

const SHUFFLE_MS = 900;

const SHUFFLE_TEXT = {
  hinglish: "Ginni deck shuffle kar rahi hai…",
  english: "Ginni is shuffling the deck…",
  hindi: "जिन्नी डेक शफ़ल कर रही है…",
};

const PICK_TEXT = {
  hinglish: (n) => `Jo card aapko bulaaye, wahi chuniye — ${n} taaza shuffled cards.`,
  english: (n) => `Choose the card that calls to you — ${n} freshly shuffled cards.`,
  hindi: (n) => `जो कार्ड आपको बुलाए, वही चुनिए — ${n} ताज़ा शफ़ल्ड कार्ड्स।`,
};

const CHOSEN_TEXT = {
  hinglish: "Card choose ho gaya. Aapki reading aa rahi hai… ✨",
  english: "Your card has been chosen. Your reading is coming… ✨",
  hindi: "कार्ड चुन लिया गया है। आपकी रीडिंग आ रही है… ✨",
};

const FOOTER_HINT = {
  hinglish: "Apni intuition par bharosa rakhiye — cards isi liye face-down hain. 🌙",
  english: "Trust your intuition — the cards are face-down for a reason. 🌙",
  hindi: "अपनी अंतर्दृष्टि पर भरोसा रखिए — कार्ड इसीलिए फेस-डाउन हैं। 🌙",
};

export default function DrawOverlay({ open, lang, spread, flippingCard, onPick, onCancel }) {
  const [phase, setPhase] = useState("shuffling");

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setPhase("spread"), SHUFFLE_MS);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const status = flippingCard ? CHOSEN_TEXT[lang] : PICK_TEXT[lang]?.(spread.length) || PICK_TEXT.hinglish(spread.length);

  return (
    <div className="draw-overlay">
      <div className="draw-overlay-scrim" />

      <div className="draw-overlay-header">
        <div>
          <div className="draw-overlay-title">Ek card chuniye</div>
          <div className="draw-overlay-status">{phase === "shuffling" ? SHUFFLE_TEXT[lang] : status}</div>
        </div>
        {!flippingCard && (
          <button className="draw-overlay-cancel" onClick={onCancel} aria-label="Cancel">
            ✕ Cancel
          </button>
        )}
      </div>

      <div className="draw-overlay-body">
        {phase === "shuffling" ? (
          <div className="draw-overlay-shuffle">
            <span className="glyph">✦</span>
            {SHUFFLE_TEXT[lang]}
          </div>
        ) : (
          <div className="draw-overlay-cards no-scrollbar">
            <div className="draw-overlay-track">
              {spread.map((c, i) => (
                <TarotCard
                  key={c}
                  cardName={c}
                  flipped={c === flippingCard}
                  disabledOther={!!flippingCard && c !== flippingCard}
                  onPick={onPick}
                  style={{
                    marginLeft: i === 0 ? 0 : "-30px",
                    zIndex: c === flippingCard ? 200 : i,
                    animationDelay: `${Math.min(i * 10, 700)}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="draw-overlay-footer">{phase === "spread" && !flippingCard ? FOOTER_HINT[lang] : "\u00A0"}</div>
    </div>
  );
}
