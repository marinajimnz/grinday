import type { User } from "@supabase/supabase-js";

/** The `aal` claim of a Supabase access token ("aal1" or "aal2"). */
export function assuranceLevelOf(accessToken: string | undefined): string | null {
  const payload = accessToken?.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { aal?: unknown };
    return typeof claims.aal === "string" ? claims.aal : null;
  } catch {
    return null;
  }
}

/**
 * True when the account has a verified second factor but this session hasn't
 * passed it yet — a password-only sign-in for someone who turned on two-step
 * verification. Such a session must go through /mfa before anything else.
 *
 * Takes the user from getUser() (fresh from the auth server) rather than the
 * copy stored in the session cookie, which another device's sign-in could
 * have left without the factor that was enrolled since.
 */
export function needsMfaStepUp(user: Pick<User, "factors"> | null, sessionLevel: string | null): boolean {
  const hasVerifiedFactor = user?.factors?.some((factor) => factor.status === "verified") ?? false;
  return hasVerifiedFactor && sessionLevel !== "aal2";
}
