"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/types";
import { fail } from "@/lib/i18n/serverErrors";

type ActionResult = { success: true } | { success: false; message: string };

export async function updateLocaleAction(locale: Locale): Promise<ActionResult> {
  if (!isLocale(locale)) {
    return fail("invalidLanguage");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("unauthenticated");
  }

  const { error } = await supabase.from("profiles").update({ locale }).eq("id", user.id);
  if (error) {
    return fail("generic", error);
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  // Every page's text depends on locale, so the whole tree needs a fresh
  // render — not just /settings/profile.
  revalidatePath("/", "layout");
  return { success: true };
}
