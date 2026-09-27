"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setVisibilitySchema, updateProfileSchema } from "@/lib/validation/profile";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

type ActionResult = { success: true } | { success: false; field?: "bio"; message: string };

// The database is what actually enforces the rules on the public @ (the
// username: reserved names, required to be public — see 0039); this turns
// its refusals into something a person can act on.
function profileWriteError(
  error: { code?: string; message?: string },
  dict: Dictionary,
): Extract<ActionResult, { success: false }> {
  const t = dict.publicProfile;
  if (error.code === "P0001" && error.message?.includes("handle_reserved")) {
    return { success: false, message: t.usernameReserved };
  }
  if (error.code === "23514" && error.message?.includes("profiles_public_needs_username")) {
    return { success: false, message: t.usernameRequired };
  }
  return { success: false, message: t.genericError };
}

function revalidateProfile() {
  revalidatePath("/settings");
  revalidatePath("/settings/profile");
  revalidatePath("/", "layout");
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const dict = getDictionary(await getLocale());
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.message === "bio_too_long") {
      return { success: false, field: "bio", message: dict.publicProfile.bioTooLong };
    }
    return { success: false, message: issue?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "No autenticado" };
  }

  const { displayName, bio } = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      // Left out entirely when the form didn't show it, so saving a name
      // never clears a bio the account can't currently see.
      ...(bio !== undefined && { bio }),
    })
    .eq("id", user.id);

  if (error) return profileWriteError(error, dict);

  revalidateProfile();
  return { success: true };
}

/**
 * The public/private choice — from the first-visit prompt or the privacy
 * card in Settings.
 */
export async function setVisibilityAction(input: unknown): Promise<ActionResult> {
  const dict = getDictionary(await getLocale());
  const parsed = setVisibilitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: dict.publicProfile.genericError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "No autenticado" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ visibility: parsed.data.visibility })
    .eq("id", user.id);

  if (error) return profileWriteError(error, dict);

  revalidateProfile();
  return { success: true };
}
