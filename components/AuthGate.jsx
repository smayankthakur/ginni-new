"use client";

import { useState } from "react";

export default function AuthGate({ onAuthed }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { email, password, name } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      onAuthed(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="onboard">
      <div className="onboard-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="The Divine Tarot" className="onboard-glyph" />
        <h1>Ginni Ki Baatein</h1>
        <p className="onboard-sub">
          {mode === "login" ? "Log in to continue your readings." : "Create an account to get 3 free readings."}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="authEmail">Email</label>
            <input
              id="authEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          {mode === "signup" && (
            <div className="field">
              <label htmlFor="authName">Your name (optional)</label>
              <input
                id="authName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="What should Ginni call you?"
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="authPassword">Password</label>
            <input
              id="authPassword"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="At least 8 characters"
            />
          </div>

          {error && (
            <p className="prompt" style={{ color: "var(--rose)", marginTop: -8, marginBottom: 16 }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode((m) => (m === "login" ? "signup" : "login"));
            setError(null);
          }}
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
