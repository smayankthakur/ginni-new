"use client";

import { useState } from "react";
import { TOPICS, LANG_LABEL } from "@/lib/topics";
import InviteModal from "./InviteModal";

const LANGS = [
  { key: "hinglish", label: "मिली" },
  { key: "english", label: "EN" },
  { key: "hindi", label: "हिं" },
];

export default function Sidebar({ name, lang, activeTopicId, onSelectTopic, onChangeLang, onRestart, onLogout, referralCode }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeTopic = TOPICS.find((t) => t.id === activeTopicId) || null;

  // aria-hidden gets applied to .topic-drawer the instant drawerOpen flips
  // false. If the close button (or anything else inside the drawer) still
  // holds focus at that moment, the browser logs an aria-hidden/focus
  // conflict and screen-reader users are left with focus stuck inside a
  // now-hidden region. Blur whatever's focused inside the drawer first, so
  // it's never aria-hidden while focused.
  function closeDrawer() {
    if (
      document.activeElement &&
      document.activeElement.closest?.(".topic-drawer")
    ) {
      document.activeElement.blur();
    }
    setDrawerOpen(false);
  }

  function pickFromDrawer(t) {
    onSelectTopic(t);
    closeDrawer();
  }

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

      {/* Mobile question trigger — replaces the old always-visible chip strip.
          Opens the same numbered topic-list markup the desktop sidebar uses
          (topic-num / topic-title / topic-meta) in a full-screen drawer, so
          nothing is truncated or hidden behind horizontal scroll anymore,
          and it collapses back to one slim row instead of permanently
          occupying its own sticky strip. */}
      <button
        type="button"
        className="question-trigger"
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
      >
        <span className="question-trigger-label">
          {activeTopic ? activeTopic.title : "Choose a question"}
        </span>
        <span className="question-trigger-chevron" aria-hidden="true">▾</span>
      </button>

      {drawerOpen && (
        <div className="topic-drawer-backdrop mobile-only" onClick={closeDrawer} />
      )}
      <div
        className={"topic-drawer mobile-only" + (drawerOpen ? " open" : "")}
        role="dialog"
        aria-label="Choose a question"
        aria-hidden={!drawerOpen}
      >
        <div className="topic-drawer-header">
          <span>Choose a question</span>
          <button
            type="button"
            className="topic-drawer-close"
            aria-label="Close"
            onClick={closeDrawer}
          >
            ×
          </button>
        </div>
        <ul className="topic-list topic-list--drawer">
          {TOPICS.map((t) => (
            <li
              key={t.id}
              className={"topic-item" + (activeTopicId === t.id ? " selected" : "")}
              onClick={() => pickFromDrawer(t)}
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
        <button className="restart-link" onClick={() => setInviteOpen(true)}>
          Invite a friend
        </button>
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
          <button onClick={() => setInviteOpen(true)}>Invite a friend</button>
          <button onClick={onRestart}>Start over</button>
          {onLogout && <button onClick={onLogout}>Log out</button>}
        </div>
      </aside>

      {inviteOpen && <InviteModal referralCode={referralCode} onClose={() => setInviteOpen(false)} />}
    </>
  );
}
