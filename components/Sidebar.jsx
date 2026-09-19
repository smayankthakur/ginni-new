"use client";

import { useState } from "react";
import { TOPICS, LANG_LABEL } from "@/lib/topics";

const LANGS = [
  { key: "hinglish", label: "मिली" },
  { key: "english", label: "EN" },
  { key: "hindi", label: "हिं" },
];

export default function Sidebar({ name, lang, activeTopicId, onSelectTopic, onChangeLang, onRestart, onLogout }) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar — only visible under 820px */}
      <div className="mobile-topbar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="The Divine Tarot" className="mobile-topbar-glyph" />
        <span className="brand">Ginni Ki Baatein</span>
        <button
          className="avatar-btn"
          aria-label={panelOpen ? "Close settings" : "Open settings"}
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((o) => !o)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
        </button>
      </div>

      {/* Mobile chip bar — every question is visible via horizontal swipe, nothing is hidden in a menu */}
      <div className="chip-bar" role="tablist" aria-label="Choose a question">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTopicId === t.id}
            className={"chip" + (activeTopicId === t.id ? " active" : "")}
            onClick={() => onSelectTopic(t)}
          >
            {t.title}
          </button>
        ))}
      </div>

      {panelOpen && <div className="sidebar-backdrop mobile-only" onClick={() => setPanelOpen(false)} />}

      {/* Compact mobile settings panel — language + restart only; topics are never hidden here */}
      <div className={"mobile-settings-panel" + (panelOpen ? " open" : "")}>
        <div className="sidebar-user">
          Reading for <b>{name}</b> · {LANG_LABEL[lang]}
        </div>
        {onChangeLang && (
          <div className="lang-switch">
            <span className="lang-switch-label">Reading language</span>
            <div className="lang-switch-row">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  className={"lang-chip" + (lang === l.key ? " active" : "")}
                  onClick={() => onChangeLang(l.key)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <button className="restart-link" onClick={onRestart}>
          Start over
        </button>
        {onLogout && (
          <button className="restart-link" onClick={onLogout}>
            Log out
          </button>
        )}
      </div>

      {/* Desktop sidebar — unchanged */}
      <aside className="sidebar">
        <div className="sidebar-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Divine Tarot" className="sidebar-glyph" />
          <span className="brand">Ginni Ki Baatein</span>
        </div>
        <div className="sidebar-user">
          Reading for <b>{name}</b> · {LANG_LABEL[lang]}
        </div>

        <ul className="topic-list">
          {TOPICS.map((t) => (
            <li
              key={t.id}
              className={"topic-item" + (activeTopicId === t.id ? " selected" : "")}
              style={{ animationDelay: `${t.id * 40}ms` }}
              onClick={() => onSelectTopic(t)}
            >
              <span className="topic-num">{String(t.id).padStart(2, "0")}</span>
              <span className="topic-text">
                <span className="topic-title">{t.title}</span>
                <span className="topic-meta">
                  {t.cards} card{t.cards > 1 ? "s" : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {onChangeLang && (
          <div className="lang-switch">
            <span className="lang-switch-label">Reading language</span>
            <div className="lang-switch-row">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  className={"lang-chip" + (lang === l.key ? " active" : "")}
                  onClick={() => onChangeLang(l.key)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          Each spread is shuffled fresh. Pick with an open mind — the card that calls to you is the
          one meant for you.
          <button onClick={onRestart}>Start over</button>
          {onLogout && <button onClick={onLogout}>Log out</button>}
        </div>
      </aside>
    </>
  );
}
