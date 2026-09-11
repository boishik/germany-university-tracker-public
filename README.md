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

## Feedback / Suggestions feature

The updated project adds a bottom-right **Feedback / Suggestions** button. Visitors can read existing reviews, post with a name or as Anonymous, and after a successful submission the button changes to **Thank you :,)** before the Support Us dialog opens.

### Shared reviews vs. static GitHub Pages

A browser cannot securely write directly into a GitHub repository file. For that reason, the project includes `functions/api/feedback.js`, a Cloudflare Pages Function that safely updates `reviews.json` through the GitHub Contents API while keeping the GitHub token on the server.

For real shared reviews, deploy the repository with Cloudflare Pages Functions and set these environment variables in the Cloudflare Pages project:

- `GITHUB_OWNER` — GitHub account/organization that owns the repository
- `GITHUB_REPO` — repository name
- `GITHUB_BRANCH` — branch to update, normally `main`
- `GITHUB_TOKEN` — fine-grained GitHub token with **Contents: Read and write** permission for only this repository
- Optional: `GITHUB_REVIEWS_PATH` — defaults to `reviews.json`

Do **not** put the token in `feedback.js`, HTML, or any public file.

If `/api/feedback` is unavailable (for example on plain GitHub Pages or local `python -m http.server`), existing public entries from `reviews.json` still load and new submissions are saved only in that visitor's browser as a safe fallback.

### Updated support timing

Marking a university as **Applied** no longer opens Support Us. The Support Us reminder now appears after about four minutes while the page is actively visible. The existing manual Support Us button and Download List reminder remain available.
