"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { success: false; message: string };

export async function followUserAction(
  followeeId: string,
  followeeUsername: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };
  if (user.id === followeeId) {
    return { success: false, message: "No puedes seguirte a ti misma" };
  }

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, followee_id: followeeId });
  // 23505 = unique_violation — already following, treat as a no-op success
  // rather than an error (the button state was already right).
  if (error && error.code !== "23505") {
    return { success: false, message: error.message };
  }

  revalidatePath(`/u/${followeeUsername}`);
  revalidatePath(`/u/${followeeUsername}/seguidores`);
  return { success: true };
}

export async function unfollowUserAction(
  followeeId: string,
  followeeUsername: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("followee_id", followeeId);
  if (error) return { success: false, message: error.message };

  revalidatePath(`/u/${followeeUsername}`);
  revalidatePath(`/u/${followeeUsername}/seguidores`);
  return { success: true };
}
