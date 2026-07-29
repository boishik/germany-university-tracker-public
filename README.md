# Germany University Application Tracker

A public, static Germany university application tracker designed for GitHub Pages or Cloudflare Pages.

## Guest-mode behavior

- Search, filter and sort all published programs.
- The first two desktop table columns remain fixed while the other columns scroll.
- Add, edit, delete and Applied-checkbox changes are saved privately in the visitor's browser.
- Browser-saved changes survive refreshes and normal browser restarts.
- Each browser profile and site origin has its own separate guest data.
- One visitor's changes are never shown to another visitor.
- Guest changes do not modify GitHub, Cloudflare or `data.json`.
- Clearing browser data, using private/incognito mode, changing browser/device, or opening a different deployment domain creates a separate guest profile.
- **Download List** exports only the programs currently visible after filtering and sorting.
- **Reset personal data** deletes that browser's saved customizations and restores the latest public dataset.

## How browser saving works

The app always loads the latest published `data.json` first. It then applies only that visitor's personal field edits, Applied selections, deleted program IDs and custom programs from `localStorage`.

This patch-based design means future updates to untouched public program fields still reach returning visitors.

## Files

- `index.html` — main page and interface
- `styles.css` — responsive design, fixed table columns and hidden-column hint
- `filters.js` — filtering and sorting logic
- `app.js` — guest persistence, editing, rendering and filtered PDF export
- `data.json` — latest public dataset
- `seed-data.js` — fallback copy generated from `data.json`
- `manifest.webmanifest` — site/PWA metadata
- `service-worker.js` — removes caches from older versions; no offline app cache
- `start-server.bat` / `start-server.sh` — optional local testing
- `assets/icon.svg` — keep your existing logo file here

## Important storage note

`localStorage` is isolated by website origin. Data saved on a GitHub Pages URL does not automatically appear on a Cloudflare Pages URL or a custom domain, even in the same browser.
