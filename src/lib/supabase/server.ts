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

/**
 * The signed-in user, validated against the auth server once per request.
 * getUser() is a network call, and the app layout (VisibilityPromptGate)
 * and the page each needed it, so every navigation paid for it twice on
 * top of the proxy's own.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
