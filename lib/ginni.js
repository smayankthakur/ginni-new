// "Ginni" persona — the warm best-friend voice around the readings.
//
// Important: these are static, per-language templates, not AI-generated
// per-card commentary. The actual tarot interpretation text always comes
// unmodified from the JSON source files (see lib/readings.js /
// lib/parseReading.js) — nothing in here rewrites or touches that content.
// This file only supplies the greeting before a spread and the supportive
// close after a reading, in Ginni's voice, using the reader's name.
//
// A *dynamic* version of this — Ginni reacting specifically to each card
// and question in real time — would need an LLM call at read time (e.g. the
// Claude API) rather than fixed templates. That's a bigger, separate piece
// of scope (server route, API key, per-reading cost) and isn't wired in
// here; ask if you want that built next.

function fill(template, name) {
  return template.replace(/\{name\}/g, name);
}

const GREETINGS = {
  hinglish: [
    "Arey {name}! Aa jao, baitho — dil se ek card choose karo, main tumhare liye dekhti hoon.",
    "{name}, main samajh sakti hoon tum yeh jaanna chahte ho. Chalo, cards se poochte hain.",
    "Ready ho {name}? Jo card tumhara dhyan kheeche, wahi tumhare liye hai.",
  ],
  english: [
    "Hey {name}! Come, sit — pick the card your heart is drawn to, I'll take it from there.",
    "{name}, I get why you want to know this. Let's ask the cards together.",
    "Ready, {name}? Whichever card catches your eye first — that one's for you.",
  ],
  hindi: [
    "अरे {name}! आओ, बैठो — दिल से एक कार्ड चुनो, मैं देखती हूँ तुम्हारे लिए।",
    "{name}, मैं समझ सकती हूँ तुम यह जानना चाहते हो। चलो, कार्ड्स से पूछते हैं।",
    "तैयार हो {name}? जो कार्ड तुम्हारा ध्यान खींचे, वही तुम्हारे लिए है।",
  ],
};

const GREETINGS_YEAR = {
  hinglish:
    "{name}, poore saal ka safar dekhna hai na — chalo, ek-ek karke saari 12 cards choose karo, mahine dar mahine. Jab saari 12 chun logi, tumhara pura saal ek saath dikhaungi.",
  english:
    "{name}, let's look at your whole year — go ahead and pick all 12 cards, one for each month. Once all 12 are drawn, I'll lay out your full year together.",
  hindi:
    "{name}, पूरे साल का सफर देखना है ना — चलो, एक-एक करके सारी 12 कार्ड्स चुनो, महीने दर महीने। जब सारी 12 चुन लोगी, मैं तुम्हारा पूरा साल एक साथ दिखाऊँगी।",
};

const CLOSINGS = {
  hinglish: [
    "Trust me {name}, jo bhi ho raha hai uska ek reason hai. Tum yeh phase achhe se cross kar loge — main tumhare saath hoon.",
    "{name}, cards ne jo dikhaya woh ek direction hai, guarantee nahi — tumhari himmat hi sabse badi taakat hai.",
    "Yaad rakhna {name}, tum akeli nahi ho isme. Ek din mein ek kadam — sab thik ho jayega.",
  ],
  english: [
    "Trust me {name}, everything happening right now has a reason. You'll get through this beautifully — I'm right here with you.",
    "{name}, what the cards showed is a direction, not a guarantee — your own courage is still the biggest force here.",
    "Remember {name}, you're not alone in this. One day at a time — it's going to be okay.",
  ],
  hindi: [
    "भरोसा रखो {name}, जो भी हो रहा है उसकी एक वजह है। तुम यह फेज अच्छे से पार कर लोगे — मैं तुम्हारे साथ हूँ।",
    "{name}, कार्ड्स ने जो दिखाया वो एक दिशा है, गारंटी नहीं — तुम्हारी हिम्मत ही सबसे बड़ी ताकत है।",
    "याद रखना {name}, तुम इसमें अकेले नहीं हो। एक दिन में एक कदम — सब ठीक हो जाएगा।",
  ],
};

function pick(arr, seed) {
  return arr[seed % arr.length];
}

export function getGreeting(name, lang, topic, seed = 0) {
  if (topic.cards > 1) {
    return fill(GREETINGS_YEAR[lang], name);
  }
  return fill(pick(GREETINGS[lang], seed), name);
}

export function getClosing(name, lang, seed = 0) {
  return fill(pick(CLOSINGS[lang], seed), name);
}
