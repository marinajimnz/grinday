"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setVisibilitySchema, updateProfileSchema } from "@/lib/validation/profile";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

type ActionResult = { success: true } | { success: false; field?: "handle" | "bio"; message: string };

// The database is what actually enforces the handle rules (format, unique,
// reserved, required to be public — see 0038); this turns its refusals
// into something a person can act on.
function profileWriteError(
  error: { code?: string; message?: string },
  dict: Dictionary,
): Extract<ActionResult, { success: false }> {
  const t = dict.publicProfile;
  if (error.code === "23505") return { success: false, field: "handle", message: t.handleTaken };
  if (error.code === "P0001" && error.message?.includes("handle_reserved")) {
    return { success: false, field: "handle", message: t.handleReserved };
  }
  if (error.code === "23514" && error.message?.includes("profiles_public_needs_handle")) {
    return { success: false, field: "handle", message: t.handleRequired };
  }
  if (error.code === "23514" && error.message?.includes("handle")) {
    return { success: false, field: "handle", message: t.handleInvalid };
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
    if (issue?.message === "handle_invalid") {
      return { success: false, field: "handle", message: dict.publicProfile.handleInvalid };
    }
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

  const { displayName, handle, bio } = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      // Left out entirely when the form didn't show them, so saving a name
      // never clears a handle the account can't currently see.
      ...(handle !== undefined && { handle }),
      ...(bio !== undefined && { bio }),
    })
    .eq("id", user.id);

  if (error) return profileWriteError(error, dict);

  revalidateProfile();
  return { success: true };
}

/**
 * The public/private choice — from the first-visit prompt or the privacy
 * card in Settings. Going public can set the handle in the same write, since
 * a public profile needs one.
 */
export async function setVisibilityAction(input: unknown): Promise<ActionResult> {
  const dict = getDictionary(await getLocale());
  const parsed = setVisibilitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, field: "handle", message: dict.publicProfile.handleInvalid };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "No autenticado" };
  }

  const choice = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update(
      choice.visibility === "public" && choice.handle
        ? { visibility: "public", handle: choice.handle }
        : { visibility: choice.visibility },
    )
    .eq("id", user.id);

  if (error) return profileWriteError(error, dict);

  revalidateProfile();
  return { success: true };
}
