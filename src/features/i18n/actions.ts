"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/types";

type ActionResult = { success: true } | { success: false; message: string };

export async function updateLocaleAction(locale: Locale): Promise<ActionResult> {
  if (!isLocale(locale)) {
    return { success: false, message: "Idioma no válido" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "No autenticado" };
  }

  const { error } = await supabase.from("profiles").update({ locale }).eq("id", user.id);
  if (error) {
    return { success: false, message: error.message };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  // Every page's text depends on locale, so the whole tree needs a fresh
  // render — not just /settings/profile.
  revalidatePath("/", "layout");
  return { success: true };
}
