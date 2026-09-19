# Card art — public/cards/

78 files, one per card, named to match exactly what the app looks up
(`lib/topics.js` → `cardSlug()`): the card name, lowercased, spaces turned
into hyphens, `.jpg` extension.

```
the-fool.jpg
the-magician.jpg
the-high-priestess.jpg
the-empress.jpg
the-emperor.jpg
the-hierophant.jpg
the-lovers.jpg
the-chariot.jpg
strength.jpg
the-hermit.jpg
wheel-of-fortune.jpg
justice.jpg
the-hanged-man.jpg
death.jpg
temperance.jpg
the-devil.jpg
the-tower.jpg
the-star.jpg
the-moon.jpg
the-sun.jpg
judgement.jpg
the-world.jpg

ace-of-cups.jpg      ace-of-pentacles.jpg   ace-of-swords.jpg      ace-of-wands.jpg
two-of-cups.jpg      two-of-pentacles.jpg   two-of-swords.jpg      two-of-wands.jpg
three-of-cups.jpg    three-of-pentacles.jpg three-of-swords.jpg    three-of-wands.jpg
four-of-cups.jpg     four-of-pentacles.jpg  four-of-swords.jpg     four-of-wands.jpg
five-of-cups.jpg     five-of-pentacles.jpg  five-of-swords.jpg     five-of-wands.jpg
six-of-cups.jpg      six-of-pentacles.jpg   six-of-swords.jpg      six-of-wands.jpg
seven-of-cups.jpg    seven-of-pentacles.jpg seven-of-swords.jpg    seven-of-wands.jpg
eight-of-cups.jpg    eight-of-pentacles.jpg eight-of-swords.jpg    eight-of-wands.jpg
nine-of-cups.jpg     nine-of-pentacles.jpg  nine-of-swords.jpg     nine-of-wands.jpg
ten-of-cups.jpg      ten-of-pentacles.jpg   ten-of-swords.jpg      ten-of-wands.jpg
page-of-cups.jpg     page-of-pentacles.jpg  page-of-swords.jpg     page-of-wands.jpg
knight-of-cups.jpg   knight-of-pentacles.jpg knight-of-swords.jpg  knight-of-wands.jpg
queen-of-cups.jpg    queen-of-pentacles.jpg queen-of-swords.jpg    queen-of-wands.jpg
king-of-cups.jpg     king-of-pentacles.jpg  king-of-swords.jpg     king-of-wands.jpg
```

## What's here right now

Every file is currently a placeholder I generated — an original geometric
design (gold frame, a central emblem, the card's name) in the app's own
gold/indigo palette. It is **not** artwork from any existing tarot deck
(Rider-Waite or otherwise) — just something to make the spread look and feel
complete while you swap in real art.

## Replacing them

Drop your own image in over any file, **keeping the exact same filename**.
No code changes needed — `TarotCard.jsx` reads `/cards/<slug>.jpg` directly.

- Recommended aspect ratio: portrait, roughly 5:8 (the placeholders are
  500×800px).
- `.jpg` is what the code currently requests. If you'd rather use `.png` or
  `.webp` for transparency/quality, either convert to `.jpg` on your end, or
  say the word and I'll update `cardSlug()`/`TarotCard.jsx` to build the
  path with a different extension.
- If a specific file is ever missing or fails to load, the app falls back to
  a plain text label so a spread never breaks — it'll just look plainer for
  that one card until the image is back.
