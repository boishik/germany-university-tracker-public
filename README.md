# Germany University Application Tracker

A public, static Germany university application tracker designed for GitHub Pages.

## Public behavior

- Search, filter and sort all published programs.
- The first two desktop table columns remain fixed while the other columns scroll.
- Add, edit, delete and Applied-checkbox changes work temporarily in the current page.
- **Export PDF** downloads only the programs currently visible after filtering and sorting.
- Refreshing the page restores the original published dataset.
- No JSON import, JSON connection, browser storage or permanent visitor saving is enabled.
- Visitors cannot modify the files in your GitHub repository.

## Files

- `index.html` — main page and interface
- `styles.css` — responsive design and fixed table columns
- `filters.js` — filtering and sorting logic
- `app.js` — temporary in-memory editing, rendering and filtered PDF export
- `data.json` — original public dataset loaded on every refresh
- `seed-data.js` — fallback dataset
- `manifest.webmanifest` — site/PWA metadata
- `service-worker.js` — removes caches from older versions; it is not registered by this public version
- `start-server.bat` / `start-server.sh` — optional local testing
- `assets/icon.svg` — site icon
