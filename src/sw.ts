import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

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
        (url.pathname.startsWith("/u/") || url.pathname === "/search" || url.pathname === "/favorites"),
      handler: new NetworkOnly(),
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
