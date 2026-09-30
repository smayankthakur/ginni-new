"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { TOPICS } from "@/lib/topics";

// Mobile-only bottom sheet listing all questions — the phone counterpart of
// the desktop sidebar. Opened from the "Sawaal" button in the composer and
// from the "Naya sawaal" follow-up under a reading (both in ChatPanel), so
// the list is reachable from the thumb zone rather than living in a column
// that squeezes the chat to a strip (the layout the client flagged).
//
// Rendered through a portal onto <body> for the same reason as DrawOverlay:
// the chat layout has its own stacking context, and a fixed sheet inside it
// would sit underneath the sticky site header. Desktop never shows this —
// page.js only opens it from controls that are `mobile-only` in CSS.

const TITLE = {
  hinglish: "Sawaal chuniye",
  english: "Choose a question",
  hindi: "सवाल चुनिए",
};
const HINT = {
  hinglish: "Tap kijiye — Ginni turant ek card nikaalegi.",
  english: "Tap one — Ginni will draw a card for it right away.",
  hindi: "टैप कीजिए — गिन्नी तुरंत एक कार्ड निकालेगी।",
};

export default function QuestionSheet({ open, lang, activeTopicId, onSelect, onClose }) {
  // Lock page scroll and close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="qsheet-backdrop" onClick={onClose}>
      <div
        className="qsheet"
        role="dialog"
        aria-modal="true"
        aria-label={TITLE[lang] || TITLE.hinglish}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="qsheet-handle" aria-hidden="true" />
        <div className="qsheet-header">
          <div>
            <div className="qsheet-title">{TITLE[lang] || TITLE.hinglish}</div>
            <div className="qsheet-hint">{HINT[lang] || HINT.hinglish}</div>
          </div>
          <button type="button" className="qsheet-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <ul className="qsheet-list">
          {TOPICS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={"qsheet-item" + (activeTopicId === t.id ? " selected" : "")}
                onClick={() => onSelect?.(t)}
              >
                <span className="qsheet-num">{String(t.id).padStart(2, "0")}</span>
                <span className="qsheet-text">{t.title}</span>
                <span className="qsheet-arrow" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}
