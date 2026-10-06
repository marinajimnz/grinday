"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { fail } from "@/lib/i18n/serverErrors";

type ActionResult = { success: true } | { success: false; message: string };

const USERNAME = /^[a-z0-9_-]{3,20}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function run(
  call: (supabase: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{ error: { code?: string } | null }>,
): Promise<ActionResult> {
  const dict = getDictionary(await getLocale());
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("unauthenticated");

  const { error } = await call(supabase);
  if (error) {
    // save_profile refuses a profile you can't see — private, suspended,
    // gone, or yourself — all with the same code, on purpose.
    return {
      success: false,
      message: error.code === "P0002" ? dict.favorites.unavailable : dict.publicProfile.genericError,
    };
  }
  revalidatePath("/favorites");
  return { success: true };
}

export async function saveProfileAction(username: string): Promise<ActionResult> {
  const value = String(username).trim().toLowerCase();
  if (!USERNAME.test(value)) return fail("invalidUser");
  return run((supabase) => supabase.rpc("save_profile", { p_username: value }));
}

export async function unsaveProfileAction(username: string): Promise<ActionResult> {
  const value = String(username).trim().toLowerCase();
  if (!USERNAME.test(value)) return fail("invalidUser");
  return run((supabase) => supabase.rpc("unsave_profile", { p_username: value }));
}

/** For a saved profile that's no longer available, which has no username to go by. */
export async function removeFavouriteAction(bookmarkId: string): Promise<ActionResult> {
  if (!UUID.test(String(bookmarkId))) return fail("invalidFavourite");
  return run((supabase) => supabase.rpc("remove_favourite", { p_bookmark_id: bookmarkId }));
}
