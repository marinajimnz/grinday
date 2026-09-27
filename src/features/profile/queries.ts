import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type Visibility = "unset" | "private" | "public";

export type MyPublicIdentity = {
  displayName: string | null;
  // The public @ is the username (0039).
  username: string | null;
  bio: string | null;
  visibility: Visibility;
  // Whether the public side of the app is on for this account (the
  // app_settings kill switch). While it's off, none of the handle/bio/
  // visibility UI shows: there'd be nothing for it to do.
  socialEnabled: boolean;
};

function asVisibility(value: string | null | undefined): Visibility {
  return value === "public" || value === "private" ? value : "unset";
}

export async function getMyPublicIdentity(supabase: Client, userId: string): Promise<MyPublicIdentity> {
  const [{ data: profile, error }, { data: socialEnabled }] = await Promise.all([
    supabase.from("profiles").select("display_name, username, bio, visibility").eq("id", userId).single(),
    supabase.rpc("social_enabled_for_me"),
  ]);
  if (error) throw error;
  return {
    displayName: profile.display_name,
    username: profile.username,
    bio: profile.bio,
    visibility: asVisibility(profile.visibility),
    socialEnabled: socialEnabled === true,
  };
}
