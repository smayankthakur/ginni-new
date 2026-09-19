"use client";

import { useEffect, useRef, useState } from "react";
import { DECK, TOPICS } from "@/lib/topics";
import { shuffle } from "@/lib/parseReading";
import { getGreeting, getClosing } from "@/lib/ginni";
import { classifyQuestion } from "@/lib/classify";
import TarotCard from "./TarotCard";
import RevealCard from "./RevealCard";
import Paywall from "./Paywall";

const INTRO = {
  hinglish: (name) =>
    `Namaste ${name}! Main Ginni hoon. Apna sawaal type kijiye, ya baayi taraf se koi sawaal chuniye — main samajh kar aapke liye ek card nikaalti hoon.`,
  english: (name) =>
    `Namaste ${name}! I'm Ginni. Type your question, or pick one from the list on the left — I'll understand it and draw a card for you.`,
  hindi: (name) =>
    `नमस्ते ${name}! मैं जिन्नी हूँ। अपना सवाल टाइप कीजिए, या बायीं तरफ़ से कोई सवाल चुनिए — मैं समझ कर आपके लिए एक कार्ड निकालती हूँ।`,
};

const LIMIT_MESSAGE = {
  hinglish: (name) => `${name}, aapki 3 free readings poori ho gayi hain. Neeche se 30 din ka full access unlock kijiye. 🌙`,
  english: (name) => `${name}, your 3 free readings are used up. Unlock 30 days of full access below. 🌙`,
  hindi: (name) => `${name}, आपकी 3 फ़्री रीडिंग्स पूरी हो गई हैं। नीचे से 30 दिन का फुल एक्सेस अनलॉक कीजिए। 🌙`,
};

const GENERIC_ERROR = {
  hinglish: "Kshama kijiye, kuch gadbad ho gayi — thodi der baad phir koshish kijiye.",
  english: "Sorry, something went wrong — please try again in a moment.",
  hindi: "क्षमा कीजिए, कुछ गड़बड़ हो गई — थोड़ी देर बाद फिर कोशिश कीजिए।",
};

const NETWORK_ERROR = {
  hinglish: "Server tak nahi pahunch payi — apna connection check karke phir try kijiye.",
  english: "Couldn't reach the server — check your connection and try again.",
  hindi: "सर्वर तक नहीं पहुँच पाई — कनेक्शन चेक करके फिर कोशिश कीजिए।",
};

const DRAW_HINT = {
  hinglish: "78 cards, taaza shuffled — jo aapko bulaaye, wahi chuniye.",
  english: "78 cards, freshly shuffled — tap the one that calls to you.",
  hindi: "78 कार्ड्स, ताज़ा शफ़ल्ड — जो आपको बुलाए, वही चुनिए।",
};

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return idCounter;
}

export default function ChatPanel({
  name,
  lang,
  access,
  onAccessChange,
  pendingAsk,
  onConsumedAsk,
  onTopicResolved,
}) {
  const [messages, setMessages] = useState(() => [
    { id: nextId(), role: "ginni", kind: "text", text: INTRO[lang]?.(name) || INTRO.hinglish(name) },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDrawId, setPendingDrawId] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const endRef = useRef(null);

  // Refs mirror the gating state so handleSend/handlePick always read the
  // latest value, even when called from the pendingAsk effect below.
  const busyRef = useRef(false);
  const pendingDrawRef = useRef(null);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => { pendingDrawRef.current = pendingDrawId; }, [pendingDrawId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingDrawId]);

  function handleSend(rawText) {
    const text = (rawText || "").trim();
    if (!text || busyRef.current || pendingDrawRef.current) return;

    const topicId = classifyQuestion(text);
    const topic = TOPICS.find((t) => t.id === topicId) || TOPICS[6];
    onTopicResolved?.(topicId);

    const drawId = nextId();
    const seed = Math.floor(Math.random() * 3);

    setMessages((m) => [
      ...m,
      { id: nextId(), role: "user", text },
      { id: nextId(), role: "ginni", kind: "text", text: getGreeting(name, lang, topic, seed) },
      { id: drawId, role: "ginni", kind: "draw", topicId, spread: shuffle(DECK), flippingCard: null },
    ]);
    setInput("");
    setPendingDrawId(drawId);
  }

  // A question clicked in the left-hand list arrives here as plain text and
  // is sent through the exact same understanding step as anything typed —
  // it never jumps straight to a topic lookup.
  useEffect(() => {
    if (pendingAsk?.text) {
      handleSend(pendingAsk.text);
      onConsumedAsk?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAsk]);

  async function handlePick(drawId, topicId, cardName) {
    if (busyRef.current) return;
    setBusy(true);
    setMessages((m) => m.map((msg) => (msg.id === drawId ? { ...msg, flippingCard: cardName } : msg)));

    let res, data;
    try {
      res = await fetch("/api/reading/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, card: cardName }),
      });
      data = await res.json();
    } catch {
      setMessages((m) =>
        m.map((msg) => (msg.id === drawId ? { id: drawId, role: "ginni", kind: "text", text: NETWORK_ERROR[lang] || NETWORK_ERROR.hinglish } : msg))
      );
      setBusy(false);
      setPendingDrawId(null);
      return;
    }

    if (!res.ok) {
      if (data.error === "limit_reached") {
        onAccessChange?.(data);
        setMessages((m) =>
          m.map((msg) => (msg.id === drawId ? { id: drawId, role: "ginni", kind: "text", text: LIMIT_MESSAGE[lang]?.(name) || LIMIT_MESSAGE.hinglish(name) } : msg))
        );
        setTimeout(() => setShowPaywall(true), 700);
      } else {
        setMessages((m) =>
          m.map((msg) => (msg.id === drawId ? { id: drawId, role: "ginni", kind: "text", text: data.error || GENERIC_ERROR[lang] || GENERIC_ERROR.hinglish } : msg))
        );
      }
      setBusy(false);
      setPendingDrawId(null);
      return;
    }

    onAccessChange?.(data.access);
    const pickToken = data.pickToken;

    setTimeout(() => {
      setMessages((m) => {
        const replaced = m.map((msg) =>
          msg.id === drawId ? { id: drawId, role: "ginni", kind: "reveal", card: cardName, pickToken } : msg
        );
        return [
          ...replaced,
          { id: nextId(), role: "ginni", kind: "text", text: getClosing(name, lang, Math.floor(Math.random() * 3)) },
        ];
      });
      setPendingDrawId(null);
      setBusy(false);
    }, 620); // matches the existing card-flip timing in ReadingPanel.jsx
  }

  const composerDisabled = busy || !!pendingDrawId;
  const freeLeft = access?.freeLeft ?? 0;

  return (
    <div className="chat-shell">
      <div className="chat-thread">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} lang={lang} onPick={handlePick} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="chat-composer-wrap">
        {!access?.subscribed && (
          <p className="chat-free-note">
            {freeLeft > 0
              ? `${freeLeft} free reading${freeLeft === 1 ? "" : "s"} remaining`
              : "Free readings used — subscribe for unlimited access"}
          </p>
        )}
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
        >
          <input
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Apna sawaal likhiye… (e.g. meri shaadi kab hogi)"
            disabled={composerDisabled}
          />
          <button className="chat-send-btn" type="submit" disabled={composerDisabled || !input.trim()}>
            Draw
          </button>
        </form>
      </div>

      {showPaywall && (
        <div className="chat-modal-backdrop" onClick={() => setShowPaywall(false)}>
          <div className="chat-modal-panel" onClick={(e) => e.stopPropagation()}>
            <button className="chat-modal-close" onClick={() => setShowPaywall(false)} aria-label="Close">
              ✕
            </button>
            <Paywall
              name={name}
              onUnlocked={(newAccess) => {
                onAccessChange?.(newAccess);
                setShowPaywall(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ChatBubble({ msg, lang, onPick }) {
  if (msg.role === "user") {
    return (
      <div className="chat-row user">
        <div className="chat-bubble user">{msg.text}</div>
      </div>
    );
  }

  if (msg.kind === "reveal") {
    return (
      <div className="chat-row ginni">
        <div className="chat-bubble ginni chat-bubble--reveal">
          <RevealCard pick={{ card: msg.card, monthIndex: 1 }} pickToken={msg.pickToken} lang={lang} monthLabel={null} />
        </div>
      </div>
    );
  }

  if (msg.kind === "draw") {
    return (
      <div className="chat-row ginni">
        <div className="chat-bubble ginni chat-bubble--draw">
          <div className="spread">
            {msg.spread.map((c, i) => (
              <TarotCard
                key={c}
                cardName={c}
                flipped={c === msg.flippingCard}
                disabledOther={!!msg.flippingCard && c !== msg.flippingCard}
                onPick={(cardName) => onPick(msg.id, msg.topicId, cardName)}
                style={{ animationDelay: `${Math.min(i * 6, 400)}ms` }}
              />
            ))}
          </div>
          <p className="spread-hint">{DRAW_HINT[lang] || DRAW_HINT.hinglish}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-row ginni">
      <div className="chat-bubble ginni">{msg.text}</div>
    </div>
  );
}
