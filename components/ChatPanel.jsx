"use client";

import { useEffect, useRef, useState } from "react";
import { DECK, TOPICS } from "@/lib/topics";
import { shuffle } from "@/lib/parseReading";
import { getGreeting, getClosing } from "@/lib/ginni";
import { classifyQuestion, looksNonLatinScript } from "@/lib/classify";
import DrawOverlay from "./DrawOverlay";
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

const CANCELLED_NOTE = {
  hinglish: "Koi baat nahi — jab chaho phir se poochh lena. 💜",
  english: "No worries — ask again whenever you're ready. 💜",
  hindi: "कोई बात नहीं — जब चाहें फिर से पूछ लीजिए। 💜",
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
  // The card-draw ritual happens full-screen (see DrawOverlay), not inline
  // in the thread — matches chat.thedivinetarotonline.com's own pattern,
  // which is also the only way 78 cards comfortably fit on a phone screen.
  const [activeDraw, setActiveDraw] = useState(null); // {id, topicId, spread, flippingCard}
  const [busy, setBusy] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const endRef = useRef(null);

  const busyRef = useRef(false);
  const activeDrawRef = useRef(null);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => { activeDrawRef.current = activeDraw; }, [activeDraw]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function handleSend(rawText) {
    const text = (rawText || "").trim();
    if (!text || busyRef.current || activeDrawRef.current) return;

    // Free classifier first — zero cost, handles Hinglish/English/Hindi
    // keyword phrasing. Only when it can't map the question at all, or the
    // text isn't in a script it was ever built to read, does this hand off
    // to the AI fallback (lib/ai.js, via the "ai" sentinel topicId) — see
    // classify.js for exactly what "can't map" means.
    const matchedId = classifyQuestion(text);
    const useAI = matchedId === null || looksNonLatinScript(text);
    const topic = TOPICS.find((t) => t.id === matchedId) || TOPICS[6]; // Universe Message — also the generic lead-in when useAI
    if (!useAI) onTopicResolved?.(matchedId);

    const seed = Math.floor(Math.random() * 3);

    setMessages((m) => [
      ...m,
      { id: nextId(), role: "user", text },
      { id: nextId(), role: "ginni", kind: "text", text: getGreeting(name, lang, topic, seed) },
    ]);
    setInput("");
    setActiveDraw({
      id: nextId(),
      topicId: useAI ? "ai" : matchedId,
      question: useAI ? text : undefined,
      spread: shuffle(DECK),
      flippingCard: null,
    });
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

  function handleCancelDraw() {
    if (busyRef.current) return; // a card is already being charged/fetched — too late to cancel
    setActiveDraw(null);
    setMessages((m) => [...m, { id: nextId(), role: "ginni", kind: "text", text: CANCELLED_NOTE[lang] || CANCELLED_NOTE.hinglish }]);
  }

  async function handlePick(cardName) {
    const draw = activeDrawRef.current;
    if (!draw || busyRef.current) return;
    setBusy(true);
    setActiveDraw((d) => (d ? { ...d, flippingCard: cardName } : d));

    let res, data;
    try {
      res = await fetch("/api/reading/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: draw.topicId, card: cardName, question: draw.question }),
      });
      data = await res.json();
    } catch {
      setActiveDraw(null);
      setMessages((m) => [...m, { id: nextId(), role: "ginni", kind: "text", text: NETWORK_ERROR[lang] || NETWORK_ERROR.hinglish }]);
      setBusy(false);
      return;
    }

    if (!res.ok) {
      setActiveDraw(null);
      if (data.error === "limit_reached") {
        onAccessChange?.(data);
        setMessages((m) => [...m, { id: nextId(), role: "ginni", kind: "text", text: LIMIT_MESSAGE[lang]?.(name) || LIMIT_MESSAGE.hinglish(name) }]);
        setTimeout(() => setShowPaywall(true), 700);
      } else {
        setMessages((m) => [...m, { id: nextId(), role: "ginni", kind: "text", text: data.error || GENERIC_ERROR[lang] || GENERIC_ERROR.hinglish }]);
      }
      setBusy(false);
      return;
    }

    onAccessChange?.(data.access);
    const pickToken = data.pickToken;
    const aiMode = draw.topicId === "ai";

    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: nextId(), role: "ginni", kind: "reveal", card: cardName, pickToken, aiMode },
        { id: nextId(), role: "ginni", kind: "text", text: getClosing(name, lang, Math.floor(Math.random() * 3)) },
      ]);
      setActiveDraw(null);
      setBusy(false);
    }, 620); // matches the existing card-flip timing from the original ReadingPanel.jsx
  }

  const composerDisabled = busy || !!activeDraw;
  const freeLeft = access?.freeLeft ?? 0;

  return (
    <div className="chat-shell">
      <div className="chat-thread">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} lang={lang} />
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

      <DrawOverlay
        key={activeDraw?.id ?? "none"}
        open={!!activeDraw}
        lang={lang}
        spread={activeDraw?.spread || []}
        flippingCard={activeDraw?.flippingCard}
        onPick={handlePick}
        onCancel={handleCancelDraw}
      />

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

function ChatBubble({ msg, lang }) {
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
          {msg.aiMode && <div className="chat-ai-tag">✨ Ginni&apos;s own words for your question</div>}
          <RevealCard
            pick={{ card: msg.card, monthIndex: 1 }}
            pickToken={msg.pickToken}
            lang={lang}
            monthLabel={null}
            aiMode={msg.aiMode}
          />
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
