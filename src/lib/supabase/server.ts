import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { requireEnv } from "@/lib/env";

// One client per request: the layout and the page render side by side, and
// sharing the instance is what lets the cached helpers below (and the
// cache()-wrapped queries that take the client as an argument) answer both
// from a single round-trip. Outside a render (actions, route handlers)
// cache() simply calls through.
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component: session refresh happens in proxy.ts instead.
          }
        },
      },
    },
  );
});

export type SessionUser = { id: string; email: string | undefined };

/**
 * The signed-in user as the session token states it, once per request.
 *
 * getClaims() checks the token's signature locally against the project's
 * published keys (asymmetric, fetched once and cached), so unlike
 * getUser() it costs no call to the auth server. That's enough here
 * because the proxy has already run getUser() on this same request, which
 * is what catches a session revoked server-side; a page only needs to know
 * whose it is.
 *
 * The token's email can trail a change by up to its lifetime (an hour), so
 * a page that shows the address uses getVerifiedUser() instead.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return { id: data.claims.sub, email: data.claims.email };
});

/** The user straight from the auth server: one network call per request. */
export const getVerifiedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
