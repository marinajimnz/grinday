import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type FollowProfileSummary = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

const PROFILE_SUMMARY_COLUMNS = "id, username, display_name, avatar_url";

export async function getFollowCounts(
  supabase: Client,
  userId: string,
): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", userId),
    supabase.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  if (followers.error) throw followers.error;
  if (following.error) throw following.error;
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export async function isFollowing(
  supabase: Client,
  followerId: string,
  followeeId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId)
    .maybeSingle();
  if (error) throw error;
  return data != null;
}

/**
 * Among `candidateIds`, which ones `followerId` already follows — used to
 * render each row's own Seguir/Siguiendo button on a followers/following
 * list without one query per row.
 */
export async function getFollowingIdsAmong(
  supabase: Client,
  followerId: string,
  candidateIds: string[],
): Promise<Set<string>> {
  if (!candidateIds.length) return new Set();
  const { data, error } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", followerId)
    .in("followee_id", candidateIds);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.followee_id));
}

// follows.follower_id/followee_id reference auth.users, not public.profiles
// directly (same pattern as coffees.user_id etc.), so there's no FK
// PostgREST can embed through — fetch the follow rows, then batch-fetch
// profiles for the ids involved, same two-step shape as listCoffees/bags.
export async function getFollowers(supabase: Client, userId: string): Promise<FollowProfileSummary[]> {
  const { data: rows, error } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("followee_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!rows?.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(PROFILE_SUMMARY_COLUMNS)
    .in(
      "id",
      rows.map((row) => row.follower_id),
    );
  if (profilesError) throw profilesError;

  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return rows
    .map((row) => byId.get(row.follower_id))
    .filter((profile): profile is FollowProfileSummary => profile != null);
}

export async function getFollowing(supabase: Client, userId: string): Promise<FollowProfileSummary[]> {
  const { data: rows, error } = await supabase
    .from("follows")
    .select("followee_id, created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!rows?.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(PROFILE_SUMMARY_COLUMNS)
    .in(
      "id",
      rows.map((row) => row.followee_id),
    );
  if (profilesError) throw profilesError;

  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return rows
    .map((row) => byId.get(row.followee_id))
    .filter((profile): profile is FollowProfileSummary => profile != null);
}
