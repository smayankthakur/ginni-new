"use client";

import { useState } from "react";

// Shows the user's own referral link with a copy button. The actual
// reward — 3 free readings for both sides — is granted server-side in
// app/api/verify-payment/route.js the first time the referred friend
// subscribes; this component only ever displays the link, it doesn't know
// or need to know anything about the reward itself.
export default function InviteModal({ referralCode, onClose }) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined" && referralCode
      ? `${window.location.origin}/?ref=${referralCode}`
      : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (older browsers, permissions) — the link
      // is still fully visible and selectable in the input either way.
    }
  }

  return (
    <div className="chat-modal-backdrop" onClick={onClose}>
      <div className="chat-modal-panel invite-modal" onClick={(e) => e.stopPropagation()}>
        <button className="chat-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h3 className="invite-title">Invite a friend</h3>
        <p className="invite-sub">
          When someone signs up with your link and subscribes, you both get 3 extra readings — free. 💜
        </p>
        {referralCode ? (
          <>
            <div className="invite-link-row">
              <input className="invite-link-input" value={link} readOnly onFocus={(e) => e.target.select()} />
              <button className="invite-copy-btn" onClick={handleCopy} type="button">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </>
        ) : (
          <p className="invite-sub">Your invite link will be ready in a moment.</p>
        )}
      </div>
    </div>
  );
}
