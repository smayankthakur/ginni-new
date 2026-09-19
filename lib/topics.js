// The 78-card deck, spelled exactly as the reading JSON keys.
export const DECK = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
  "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit", "Wheel of Fortune",
  "Justice", "The Hanged Man", "Death", "Temperance", "The Devil", "The Tower", "The Star",
  "The Moon", "The Sun", "Judgement", "The World",
  ...["Cups", "Pentacles", "Swords", "Wands"].flatMap((suit) =>
    ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"].map(
      (rank) => `${rank} of ${suit}`
    )
  ),
];

// The fixed set of questions shown in the sidebar. Titles are Mayank's exact
// wording where given. Topics 1&3 and 2&4 intentionally share one data
// source (only one "partner" style reading set exists; the crush framing
// reuses it). Topic 7 now reads from the real universe_guidance.json.
export const TOPICS = [
  { id: 1, title: "Unki Current Feelings For You", cards: 1, dataKey: "partnerFeelings", prompt: "Ek card draw karo aur dekho abhi unke dil mein kya chal raha hai." },
  { id: 2, title: "Unke Next Actions", cards: 1, dataKey: "partnerAction", prompt: "Ek card draw karo — wo aage kya kadam lene wale hain." },
  { id: 3, title: "Aapke Crush Ki Current Feelings For You", cards: 1, dataKey: "partnerFeelings", prompt: "Ek card draw karo aur dekho abhi unke dil mein kya chal raha hai." },
  { id: 4, title: "Aapke Crush ka Next actions", cards: 1, dataKey: "partnerAction", prompt: "Ek card draw karo — wo aage kya kadam lene wale hain." },
  { id: 5, title: "Yes or No", cards: 1, dataKey: "yesNo", prompt: "Apna sawaal mann mein socho, phir ek card draw karo." },
  { id: 6, title: "Third Party or Unke Bich kya chal raha hai", cards: 1, dataKey: "thirdParty", prompt: "Ek card draw karo aur dekho situation kab tak clear hogi." },
  { id: 7, title: "Universe Message", cards: 1, dataKey: "universeGuidance", prompt: "Ek card draw karo — aaj universe ka message kya hai." },
  { id: 8, title: "Aapki spritual journey kaunsi hai", cards: 1, dataKey: "spiritualJourney", prompt: "Ek card draw karo aur apni spiritual journey ka naam jaano." },
  { id: 9, title: "Aapka mahina kaisa rahega", cards: 1, dataKey: "monthly", prompt: "Ek card draw karo — is mahine ka overview." },
  { id: 10, title: "Aapka Baby Kab Hoga", cards: 1, dataKey: "babyKabHoga", prompt: "Ek card draw karo aur dekho timing energy kya keh rahi hai." },
  { id: 11, title: "Aapka Soulmate Kab Milega", cards: 1, dataKey: "soulmateKabMilega", prompt: "Ek card draw karo aur dekho soulmate ki timing kya keh rahi hai." },
  { id: 12, title: "Aapke Rishte Ka Past, Present Aur Future", cards: 1, dataKey: "relationshipPPF", prompt: "Ek card draw karo — is card mein tumhare rishte ka pura safar dikhega." },
  { id: 13, title: "Aapka Union Kab Hoga", cards: 1, dataKey: "unionKabHoga", prompt: "Ek card draw karo aur dekho union ki timing kya keh rahi hai." },
  { id: 14, title: "Aapki Shaadi Kab Hogi", cards: 1, dataKey: "shaadiKabHogi", prompt: "Ek card draw karo aur dekho shaadi ki timing kya keh rahi hai." },
  { id: 15, title: "Aapko Aapka Life Partner Kab Milega", cards: 1, dataKey: "lifepartnerKabMilega", prompt: "Ek card draw karo aur dekho life partner ki timing kya keh rahi hai." },
];

export const LANG_LABEL = { hinglish: "Hinglish", english: "English", hindi: "Hindi" };

// Turns a card name into its image filename, e.g. "The Fool" -> "the-fool",
// "Ace of Cups" -> "ace-of-cups". Matches every file in public/cards/.
export function cardSlug(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

// A small emoji badge per card category — Major Arcana vs. each suit —
// purely decorative, echoing the little emoji tag next to each card on
// thedivinetarotonline.com's homepage reveal section.
export function cardEmoji(name) {
  if (name.includes("of Cups")) return "💧";
  if (name.includes("of Pentacles")) return "🪙";
  if (name.includes("of Swords")) return "⚔️";
  if (name.includes("of Wands")) return "🔥";
  return "✨"; // Major Arcana
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const UNAVAILABLE_MESSAGE = {
  hinglish: "Yeh reading abhi Hinglish mein available nahi hai.",
  english: "This reading isn't available in English yet.",
  hindi: "यह रीडिंग अभी हिंदी में उपलब्ध नहीं है।",
};
