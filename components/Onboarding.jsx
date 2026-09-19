"use client";

import { useState } from "react";

const LANGS = [
  { key: "hinglish", native: "Hinglish", label: "मिली-जुली" },
  { key: "english", native: "English", label: "English" },
  { key: "hindi", native: "हिंदी", label: "Hindi" },
];

export default function Onboarding({ onBegin, defaultName }) {
  const [name, setName] = useState(defaultName || "");
  const [lang, setLang] = useState("hinglish");

  return (
    <div id="onboard">
      <div className="onboard-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="The Divine Tarot" className="onboard-glyph" />
        <h1>Ginni Ki Baatein</h1>
        <p className="onboard-sub">
          A private tarot counsel. Tell me your name and the tongue
          <br />
          you&rsquo;d like your reading in.
        </p>

        <div className="field">
          <label htmlFor="nameInput">Your name</label>
          <input
            id="nameInput"
            type="text"
            placeholder="e.g. Priya"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Reading language</label>
          <div className="lang-options">
            {LANGS.map((l) => (
              <div
                key={l.key}
                className={"lang-opt" + (lang === l.key ? " active" : "")}
                onClick={() => setLang(l.key)}
              >
                <span className="lang-native">{l.native}</span>
                {l.label}
              </div>
            ))}
          </div>
        </div>

        <button
          className="btn-primary"
          disabled={name.trim().length === 0}
          onClick={() => onBegin(name.trim(), lang)}
        >
          Start your reading
        </button>
      </div>
    </div>
  );
}
