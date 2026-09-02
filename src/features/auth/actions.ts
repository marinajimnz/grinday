"use server";

import { createAdminClient } from "@/lib/supabase/admin";

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
