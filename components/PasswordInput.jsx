"use client";

import { useState } from "react";

// Password field with a show/hide toggle (eye / eye-off), the way
// Instagram and most login forms do it. Used for every password box in the
// app — log in, create account, and both fields on the reset page — so
// they all behave the same. Accepts every prop a normal <input> does.
//
// The toggle is a real button (keyboard + screen-reader friendly), and
// `tabIndex={-1}` keeps Tab moving from the password straight to the next
// field; the eye is still clickable/tappable. Toggling never clears the
// value — the input stays the same element, only its type flips.

function EyeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M17.94 17.94A10.5 10.5 0 0 1 12 19c-6.5 0-10-7-10-7a19.8 19.8 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.9 9.9 0 0 1 12 4c6.5 0 10 7 10 7a19.8 19.8 0 0 1-3.17 4.19" />
      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

export default function PasswordInput({ className = "", ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-wrap">
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        className={"password-input " + className}
        // keep the browser's password tooling (managers, autofill) engaged
        // even while the characters are shown
        data-password="true"
        spellCheck={false}
        autoCapitalize="off"
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
