"use client";

import { useState, useEffect } from "react";
import AuthGate from "@/components/AuthGate";
import Onboarding from "@/components/Onboarding";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { TOPICS } from "@/lib/topics";

export default function Home() {
  const [me, setMe] = useState(null); // null while loading; {loggedIn, ...access} once known
  const [session, setSession] = useState(null); // {name, lang} — onboarding personalization, separate from auth
  const [activeTopic, setActiveTopic] = useState(null); // highlight only — the chat below is the source of truth
  const [pendingAsk, setPendingAsk] = useState(null); // {text, nonce} — a sidebar click waiting to be sent

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ loggedIn: false }));
  }, []);

  if (me === null) {
    return null; // brief blank frame while the session check resolves
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe({ loggedIn: false });
    setSession(null);
    setActiveTopic(null);
  }

  // Clicking a question in the sidebar fills the chat input with its exact
  // title and sends it — it goes through the same classifyQuestion() step
  // as anything typed (see ChatPanel.jsx), it never jumps straight to a
  // known topic id.
  function handleSelectTopic(topic) {
    setActiveTopic(topic);
    setPendingAsk({ text: topic.title, nonce: Date.now() });
  }

  return (
    <div className="site-page">
      <SiteHeader />

      {!me.loggedIn ? (
        <AuthGate onAuthed={setMe} />
      ) : !session ? (
        <Onboarding defaultName={me.name} onBegin={(name, lang) => setSession({ name, lang })} />
      ) : (
        <div id="app" className="active">
          <Sidebar
            name={session.name}
            lang={session.lang}
            activeTopicId={activeTopic?.id}
            onSelectTopic={handleSelectTopic}
            onChangeLang={(lang) => setSession((prev) => ({ ...prev, lang }))}
            onRestart={() => {
              setSession(null);
              setActiveTopic(null);
            }}
            onLogout={handleLogout}
            referralCode={me.referralCode}
          />
          <main className="main chat-mode">
            <div className="main-inner chat-main-inner">
              <ChatPanel
                key={session.name}
                name={session.name}
                lang={session.lang}
                access={me}
                onAccessChange={(newAccess) => setMe((prev) => ({ ...prev, ...newAccess }))}
                pendingAsk={pendingAsk}
                onConsumedAsk={() => setPendingAsk(null)}
                onTopicResolved={(topicId) => setActiveTopic(TOPICS.find((t) => t.id === topicId) || null)}
              />
            </div>
          </main>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
