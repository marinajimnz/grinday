import { defaultCache } from "@serwist/next/worker";
import { CacheFirst, CacheableResponsePlugin, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { isSignedPhotoUrl, PHOTO_CACHE_NAME, photoCacheKey } from "@/lib/photoCache";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Other accounts' public pages (profiles, search, favourites) are never kept on the device: a profile
  // that goes private or gets suspended must stop showing at once, and on a
  // shared phone the next person signed in mustn't find the last one's
  // browsing in the cache. Checked before defaultCache, which would
  // otherwise keep them like any page.
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin &&
        (url.pathname.startsWith("/u/") ||
          url.pathname === "/search" ||
          url.pathname === "/favorites" ||
          url.pathname.startsWith("/admin")),
      handler: new NetworkOnly(),
    },
    // The account's own photos, kept under their path rather than their
    // ever-changing signed URL (see lib/photoCache.ts). Fetched in CORS mode
    // (Storage allows it) so the response can be checked and stored as it
    // is: an <img> asks in no-cors mode, and an opaque response can be
    // neither told apart from an error nor stored without inflating the
    // device's quota several megabytes per photo.
    {
      matcher: ({ url, sameOrigin }) => !sameOrigin && isSignedPhotoUrl(url),
      handler: new CacheFirst({
        cacheName: PHOTO_CACHE_NAME,
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request }) => photoCacheKey(request.url),
            requestWillFetch: async ({ request }) =>
              new Request(request.url, { mode: "cors", credentials: "omit" }),
          },
          // An expired signature comes back as a 400: never keep that.
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30, maxAgeFrom: "last-used" }),
        ],
      }),
    },
    ...defaultCache,
  ],
  // Fase 7: when a navigation can't be served from network or cache, show
  // the offline shell (café activo snapshot + pending drafts) instead of
  // the browser's own error page.
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
