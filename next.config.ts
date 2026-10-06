import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Sent with every response. The CSP stops at the directives that need no
// per-request nonce: a script-src one would make every page dynamic, and
// /offline has to stay static so the service worker can precache it.
// Strict-Transport-Security is left to Vercel, which sets it on its domains.
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    // frame-ancestors: no other site can frame the app and trick a click
    // onto it. The rest close the usual side doors for injected markup.
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  // The same refusal to be framed, for browsers that predate frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Photos come in through a plain file input, which needs none of these.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
