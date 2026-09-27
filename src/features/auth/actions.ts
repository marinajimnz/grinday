"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validation/auth";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

type ResolveResult = { success: true; email: string } | { success: false; message: string };

/**
 * The login form takes one "usuario o email" field. An email is used as-is;
 * a plain username has to be resolved to the account's real (or synthetic)
 * email first, since Supabase Auth itself only ever signs in by email. That
 * lookup needs the service-role client — RLS on `profiles` only lets a user
 * read their own row, and there's no session yet at login time anyway.
 */
export async function resolveLoginEmailAction(identifier: string): Promise<ResolveResult> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return { success: false, message: "Escribe tu usuario o email" };
  }
  if (trimmed.includes("@")) {
    return { success: true, email: trimmed };
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id")
    .eq("username", trimmed.toLowerCase())
    .maybeSingle();

  if (error) {
    return { success: false, message: error.message };
  }
  if (!profile) {
    return { success: false, message: "Usuario o contraseña incorrectos" };
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id);
  if (userError || !userData.user?.email) {
    return { success: false, message: "Usuario o contraseña incorrectos" };
  }

  return { success: true, email: userData.user.email };
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

  const resolved = await resolveLoginEmailAction(trimmed);
  if (resolved.success) {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    const origin = `${protocol}://${host}`;

    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(resolved.email, {
      redirectTo: `${origin}/reset-password`,
    });
  }

  return { success: true };
}
