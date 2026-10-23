# Purrfect Match 🐾

Tinder for cats. A just-for-fun prototype: no backend, no accounts, no real cats were matched.

**Live:** https://pawelbozek92-gif.github.io/purrfect-match/

## What you can do

- **Discover** – swipe cards left (nope), right (like) or up (super like). Buttons and keyboard work too: `←` `→` `↑`, `Z` to undo. Tap the left/right side of a card to flip photos, or ⓘ for the full profile.
- **Matches** – some cats like you back. Chat with them; they reply with (very) cat-like messages.
- **My cat** – design your own cat (coat, pattern, eyes, accessory), edit the bio and set the search distance. **Reset demo** starts over.

## How it works

- Plain HTML/CSS/JS, no build step. Hosted free on GitHub Pages.
- `data.js` – 20 mock cat profiles and chat replies.
- `cat-art.js` – draws every cat "photo" as SVG, so there are no image files.
- `app.js` – swiping, matching, chat and profile. Progress is saved in the browser's `localStorage`, so each tester has their own swipes and matches.

## Run locally

Open `index.html` in a browser, or serve the folder with any static server.
