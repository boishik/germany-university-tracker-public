"use strict";

/*
 * Public GitHub version:
 * No offline cache is used because every refresh should load the original
 * published dataset and discard temporary browser-session changes.
 *
 * This file also removes older tracker service workers and caches if a
 * previous version of the project registered one.
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
