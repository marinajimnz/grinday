"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validation/auth";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { clearFailures, clientIp, isThrottled, recordFailure, throttleKeys } from "./loginThrottle";

/**
 * The account's real (or synthetic) email for what was typed in the login
 * form's one "usuario o email" field: an email as-is, a username looked up.
 * Supabase Auth only signs in by email, and the lookup needs the
 * service-role client — RLS on `profiles` only lets a user read their own
 * row, and there's no session yet at login time anyway.
 *
 * Deliberately not exported. In a "use server" file every export is an
 * endpoint anyone can call, and this one used to be: it handed the email
 * of any @username — public ones are listed in search — to whoever asked.
 * Now the email never leaves the server; only the actions below use it.
 */
async function resolveEmail(identifier: string): Promise<string | null> {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", trimmed.toLowerCase())
    .maybeSingle();
  if (!profile) return null;

  const { data: userData } = await admin.auth.admin.getUserById(profile.id);
  return userData.user?.email ?? null;
}

type LoginResult = { success: true } | { success: false; message: string };

/**
 * Signs in with a username or an email, all on the server: the session
 * cookies are set here, and the browser only ever learns whether it worked.
 * An unknown username and a wrong password get the same answer, so this
 * can't be used to find out which usernames exist.
 *
 * Throttled by the app itself (loginThrottle.ts): with the sign-in on the
 * server, Supabase Auth's own per-IP limit only ever sees the server. An
 * unknown username counts as a failure like a wrong password does, so being
 * throttled says nothing about whether the account exists either.
 */
export async function loginAction(identifier: string, password: string): Promise<LoginResult> {
  const dict = getDictionary(await getLocale());
  if (!identifier.trim()) {
    return { success: false, message: dict.login.identifierRequired };
  }

  const admin = createAdminClient();
  const keys = throttleKeys(identifier, clientIp(await headers()));
  if (await isThrottled(admin, keys)) {
    return { success: false, message: dict.login.tooManyAttempts };
  }

  const email = await resolveEmail(identifier);
  const supabase = await createClient();
  const signedIn = email !== null && !(await supabase.auth.signInWithPassword({ email, password })).error;
  if (!signedIn) {
    await recordFailure(admin, keys);
    return { success: false, message: dict.login.error };
  }

  await clearFailures(admin, keys);
  return { success: true };
}

type RegisterResult =
  | { success: true }
  | { success: false; field?: "name" | "username" | "email" | "password"; message: string };

/**
 * Public sign-up. Uses the service-role client to create the auth user
 * directly, pre-confirmed — there's no email step, so a friend can register
 * and land straight in the app, matching the login form's own username-or-
 * email flow (a fresh account always gets a username here).
 */
export async function registerAction(input: unknown): Promise<RegisterResult> {
  const dict = getDictionary(await getLocale());
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    if (field === "username") return { success: false, field: "username", message: dict.register.usernameInvalid };
    if (field === "email") return { success: false, field: "email", message: dict.register.emailInvalid };
    if (field === "password") return { success: false, field: "password", message: dict.register.passwordTooShort };
    return { success: false, field: "name", message: dict.register.nameRequired };
  }
  const { name, username, email, password } = parsed.data;

  const admin = createAdminClient();

  const { data: existingUsername } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existingUsername) {
    return { success: false, field: "username", message: dict.register.usernameTaken };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    if (createError?.code === "email_exists") {
      return { success: false, field: "email", message: dict.register.emailTaken };
    }
    return { success: false, message: dict.register.genericError };
  }

  const locale = await getLocale();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ display_name: name, username, locale })
    .eq("id", created.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    if (profileError.code === "23505") {
      return { success: false, field: "username", message: dict.register.usernameTaken };
    }
    // A reserved name (reserved_handles) — the username is also the public @.
    if (profileError.code === "P0001") {
      return { success: false, field: "username", message: dict.register.usernameReserved };
    }
    return { success: false, message: dict.register.genericError };
  }

  return { success: true };
}

type RequestPasswordResetResult = { success: true } | { success: false; message: string };

/**
 * "Forgot your password?" — always resolves to the same generic outcome
 * regardless of whether the identifier actually matched an account, so this
 * can't be used to probe which usernames/emails are registered. The one
 * exception is a genuinely empty input, which is just a form-validation
 * problem, not an enumeration risk.
 */
export async function requestPasswordResetAction(identifier: string): Promise<RequestPasswordResetResult> {
  const dict = getDictionary(await getLocale());
  const trimmed = identifier.trim();
  if (!trimmed) {
    return { success: false, message: dict.forgotPassword.identifierRequired };
  }

  const email = await resolveEmail(trimmed);
  if (email) {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    const origin = `${protocol}://${host}`;

    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
  }

  return { success: true };
}
