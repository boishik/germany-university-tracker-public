"use strict";

/*
 * Guest-mode public version:
 * Personal tracker changes are stored in localStorage by app.js.
 *
 * This service worker intentionally provides no offline application cache.
 * It only removes older tracker service workers and caches so deployed HTML,
 * CSS, JavaScript and public data updates are fetched normally.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("germany-university-tracker"))
            .map((key) => caches.delete(key))
        )
      ),
      self.registration.unregister()
    ]).then(() => self.clients.claim())
  );
});
