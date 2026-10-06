import "server-only";

/**
 * The app's own address, for links that leave it — the password reset
 * email. Never taken from the request: Host and X-Forwarded-Host are
 * whatever the caller sends, and a reset link built from them could point
 * at someone else's site and hand them the recovery code.
 *
 * NEXT_PUBLIC_SITE_URL wins when set (a custom domain). Otherwise, on
 * Vercel, its own VERCEL_PROJECT_PRODUCTION_URL — the production domain,
 * set by the platform, so previews also send people to production. In
 * development, localhost. Anywhere else there's no safe answer, and null
 * says so.
 */
export function siteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return null;
}
