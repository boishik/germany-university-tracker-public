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

## Important data note

Everything committed to a public GitHub repository can be viewed or downloaded. Keep only public university information in `data.json` and `seed-data.js`. Do not include passwords, tokens, applicant IDs, passport details, private notes or personal documents.

## Test locally

### Windows

Double-click:

```text
start-server.bat
```

Then open:

```text
http://localhost:8000
```

### macOS/Linux

```bash
chmod +x start-server.sh
./start-server.sh
```

Then open:

```text
http://localhost:8000
```

## Push to GitHub

Create an empty GitHub repository, then run these commands inside this project folder:

```bash
git init
git add .
git commit -m "Publish Germany university application tracker"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace `YOUR-USERNAME` and `YOUR-REPOSITORY` with your real GitHub details.

## Enable GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose the `main` branch.
5. Choose `/ (root)`.
6. Click **Save**.

The live URL will normally be:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

## Updating the published dataset

Edit both:

- `data.json`
- `seed-data.js`

Then commit and push the changes. `seed-data.js` should contain the same dataset wrapped as:

```javascript
window.TRACKER_SEED_DATA = { ... };
```

The public page never writes visitor changes back to these files.
