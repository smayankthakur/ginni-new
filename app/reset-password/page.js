"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PasswordInput from "@/components/PasswordInput";

// /reset-password?token=... — the page the emailed link opens. Checks the
// token first so an expired link says so immediately, then takes the new
// password (twice), and on success the API has already logged the person
// in, so "Continue" just goes home.
export default function ResetPasswordPage() {
  // Read once from the URL on the client; the token itself is never
  // rendered, so the server's empty value causes no hydration mismatch.
  const [token] = useState(() =>
    typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") || ""
  );
  const [valid, setValid] = useState(null); // null = checking
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setValid(!!d.valid); })
      .catch(() => { if (!cancelled) setValid(false); });
    return () => { cancelled = true; };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="site-page">
      <SiteHeader />
      <div id="onboard">
        <div className="onboard-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Divine Tarot" className="onboard-glyph" />
          <h1>Ginni Ki Baatein</h1>

          {valid === null && <p className="onboard-sub">Checking your reset link…</p>}

          {valid === false && (
            <>
              <p className="onboard-sub">This reset link is invalid or has expired.</p>
              <p className="prompt" style={{ color: "var(--text-muted)", marginBottom: 20 }}>
                Reset links work for 30 minutes and can only be used once. Request a fresh one from the login screen.
              </p>
              <Link href="/" className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                Back to log in
              </Link>
            </>
          )}

          {valid && done && (
            <>
              <p className="onboard-sub">Your password has been changed. You&rsquo;re logged in.</p>
              <Link href="/" className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                Continue to your readings
              </Link>
            </>
          )}

          {valid && !done && (
            <>
              <p className="onboard-sub">Choose a new password for your account.</p>
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="newPassword">New password</label>
                  <PasswordInput
                    id="newPassword"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="field">
                  <label htmlFor="confirmPassword">Confirm new password</label>
                  <PasswordInput
                    id="confirmPassword"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Type it again"
                  />
                </div>
                {error && (
                  <p className="prompt" style={{ color: "var(--rose)", marginTop: -8, marginBottom: 16 }}>
                    {error}
                  </p>
                )}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Please wait…" : "Set new password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
