# Translating this site

Every word the site says lives in this folder, one JSON file per part of the
site. To translate into Spanish, open the files under `es/` and replace the
English values with Spanish ones. **Leave the keys — the words on the left of
each colon — exactly as they are.**

```bash
npm run check:translations
```

Run that whenever you like. It tells you how many strings are done and lists
what is left, by file. It never fails a build; it is a progress bar, not a gate.

`en/` is the site as it reads today. Never edit `es/` by copying a whole file
from `en/` once you have started — that would undo your work.

---

## An array is a set of lines, and you choose where they break

```json
"tagline": ["One Question. Three Cards.", "Your Path Illuminated."]
```

That renders as two lines, one above the other. It is not a list of
alternatives and it is not a sentence split by accident — a designer chose that
break so the two lines balance.

So **you are choosing where the Spanish breaks**, in a language whose sentences
run roughly 20–25% longer than the English. Keep the same number of entries
unless the meaning genuinely needs a different shape, and try to keep the lines
close to each other in length.

A few arrays nest, like this one from a reading page:

```json
"included": [
  ["A Three Card Reading", "focused on your path forward"],
  ["Presented on original", "World Tarot", "artwork"]
]
```

Each inner array is one bullet, split into its rendered lines. The three-part
one is deliberate: the middle piece is the brand name, set in its own typeface,
and the extra break is what stops a phone wrapping the name in half.

## Some entries have a mobile twin

```json
"label": ["ASK A QUESTION", "GET A PERSONAL READING"],
"labelMobile": ["GET A PERSONAL", "READING"]
```

The shorter one is what phones show, where the full version wraps too tall.
Both need translating, and the mobile one needs to stay noticeably shorter.

## Braces are values the site fills in

```json
"body": "Thank you. Your {reading} is being written, and it will be sent to {email}."
```

`{reading}` and `{email}` are replaced at the moment the sentence is shown.
**Keep the braces and spell the word inside them exactly as it is** — move the
whole `{reading}` to wherever Spanish wants it in the sentence. If a brace is
mistyped or dropped, the visitor sees `{reading}` on screen instead of the name
of their reading.

## Do not translate anything that looks like an address

You should not find any URLs, file paths or image names in these files — they
stay in the code alongside the layout. If you find something like
`/readings/month-ahead/` or `hero-card.webp` in a file under `es/`, that is a
bug in how the file was made. Leave it and tell whoever handed you this.

## What is not here

- **Prices.** Money comes from the backend as the page loads, already formatted
  for the visitor's currency. The site never converts a price and never invents
  one.
- **Roman numerals**, like a card's `XVII`. The same in every language.
- **Names.** "The World Tarot" and "The Living Tarot" are the house's own names
  and stay as they are.

## When you are finished

Spanish will not appear on the site the moment this folder is complete. Two
things happen elsewhere first: the site needs its Spanish addresses built, and
the backend has to publish `es` in its list of languages. Both are somebody
else's job and neither is blocked by you — see
`docs/plans/seo-and-translations.md` for who owns what.
