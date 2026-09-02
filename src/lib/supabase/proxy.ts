import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /offline has to work without a session: it's the Service Worker's
// no-network fallback, reached with no server round-trip at all when it
// really matters, but it must also render on a direct, unauthenticated
// visit (e.g. testing it, or a stale tab reloading offline before login).
const PUBLIC_PATHS = new Set(["/login", "/offline"]);

/**
 * Refreshes the Supabase session cookie on every request and gates every
 * page behind login — anyone without a session is redirected to /login, and
 * anyone already signed in never sees /login itself.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.has(pathname) || pathname.startsWith("/api/");

  if (!user && !isPublicPath) {
    return redirectCarryingCookies(request, response, "/login");
  }

  if (user && pathname === "/login") {
    return redirectCarryingCookies(request, response, "/");
  }

  return response;
}

// A redirect needs a fresh NextResponse, so any session cookies the client
// just refreshed (on `response`, via setAll above) have to be copied across
// by hand or the refresh is silently dropped.
function redirectCarryingCookies(request: NextRequest, response: NextResponse, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  const redirectResponse = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}
