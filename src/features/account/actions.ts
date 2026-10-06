"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { changeEmailSchema, changePasswordSchema, changeUsernameSchema } from "@/lib/validation/account";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { fail } from "@/lib/i18n/serverErrors";

type ActionResult = { success: true } | { success: false; message: string };

export async function changeUsernameAction(input: unknown): Promise<ActionResult> {
  const dict = getDictionary(await getLocale());
  const parsed = changeUsernameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: dict.register.usernameInvalid };
  }
  const { newUsername } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("unauthenticated");

  // RLS only lets a user read their own profile row, so checking whether
  // someone else already has this username needs the service-role client —
  // same reasoning as the equivalent check in registerAction.
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("username", newUsername)
    .maybeSingle();
  if (existing && existing.id !== user.id) {
    return { success: false, message: dict.register.usernameTaken };
  }

  const { error } = await supabase.from("profiles").update({ username: newUsername }).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { success: false, message: dict.register.usernameTaken };
    // Reserved names (reserved_handles): the username is also the public @.
    if (error.code === "P0001") return { success: false, message: dict.register.usernameReserved };
    return fail("generic", error);
  }

  revalidatePath("/settings/account");
  revalidatePath("/settings/profile");
  revalidatePath("/settings");
  return { success: true };
}

export async function changeEmailAction(input: unknown): Promise<ActionResult> {
  const dict = getDictionary(await getLocale());
  const parsed = changeEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: dict.register.emailInvalid };
  }
  const { newEmail } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("unauthenticated");

  if (newEmail === user.email) {
    return { success: false, message: dict.settings.emailSameAsCurrent };
  }

  // Updated through the admin API and pre-confirmed, matching how
  // registerAction creates accounts — this app never sends a real
  // confirmation email, so Supabase's own change-email flow (which waits on
  // one) would leave the account stuck in "pending" indefinitely.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: newEmail,
    email_confirm: true,
  });
  if (error) {
    if (error.code === "email_exists") return { success: false, message: dict.register.emailTaken };
    return fail("generic", error);
  }

  revalidatePath("/settings/account");
  return { success: true };
}

export async function changePasswordAction(input: unknown): Promise<ActionResult> {
  const dict = getDictionary(await getLocale());
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: dict.register.passwordTooShort };
  }
  const { currentPassword, newPassword } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return fail("unauthenticated");

  // auth.updateUser() trusts the existing session and won't ask for the
  // current password itself, so it's checked here first by re-authenticating
  // with it — the whole point of asking for it in this form.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return { success: false, message: dict.settings.currentPasswordIncorrect };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (error.code === "same_password") return { success: false, message: dict.settings.passwordSameAsCurrent };
    if (error.code === "weak_password") return { success: false, message: dict.register.passwordTooShort };
    return fail("generic", error);
  }

  return { success: true };
}
