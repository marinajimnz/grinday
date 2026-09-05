import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type RecentAttempt = {
  id: string;
  attempt_no: number;
  method: string;
  created_at: string;
  dose_g: number | null;
  water_g: number | null;
  target_weight_g: number | null;
  output_weight_g: number | null;
  extraction_ms: number | null;
  overall_rating: number | null;
  coffee: { id: string; name: string; roaster: string } | null;
};

const RECENT_ATTEMPT_FIELDS =
  "id, attempt_no, method, created_at, dose_g, water_g, target_weight_g, output_weight_g, extraction_ms, overall_rating, coffee:coffees!brew_attempts_coffee_id_fkey(id, name, roaster)";

export async function getRecentAttempts(supabase: Client, limit = 4): Promise<RecentAttempt[]> {
  const { data, error } = await supabase
    .from("brew_attempts")
    .select(RECENT_ATTEMPT_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getDashboardOverview(supabase: Client) {
  const { data, error } = await supabase.rpc("dashboard_overview").maybeSingle();
  if (error) throw error;
  return {
    totalBrews: data?.total_brews ?? 0,
    avgRating: data?.avg_rating ?? null,
    favoriteMethod: data?.favorite_method ?? null,
  };
}

export async function hasAnyCoffee(supabase: Client) {
  const { count, error } = await supabase
    .from("coffees")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null);
  if (error) throw error;
  return (count ?? 0) > 0;
}
