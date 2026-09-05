import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type StatsDateRange = { from?: string; to?: string };

export type CoffeeStatRow = Database["public"]["Functions"]["stats_by_coffee"]["Returns"][number];
export type DimensionStatRow =
  Database["public"]["Functions"]["stats_by_dimension"]["Returns"][number];
export type MethodStatRow = Database["public"]["Functions"]["stats_by_method"]["Returns"][number];
export type NoteStatRow = Database["public"]["Functions"]["stats_frequent_notes"]["Returns"][number];
export type BucketStatRow = { bucket: number; count: number };

export type StatsDimension = "country" | "process" | "roast_level" | "roaster";

export async function getTotalRatedAttempts(supabase: Client, range: StatsDateRange) {
  let query = supabase
    .from("brew_attempts")
    .select("id", { count: "exact", head: true })
    .not("overall_rating", "is", null);
  if (range.from) query = query.gte("created_at", range.from);
  if (range.to) query = query.lte("created_at", range.to);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getTopCoffees(supabase: Client, range: StatsDateRange) {
  const { data, error } = await supabase.rpc("stats_by_coffee", {
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getStatsByDimension(
  supabase: Client,
  dimension: StatsDimension,
  range: StatsDateRange,
) {
  const { data, error } = await supabase.rpc("stats_by_dimension", {
    p_dimension: dimension,
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getStatsByMethod(supabase: Client, range: StatsDateRange) {
  const { data, error } = await supabase.rpc("stats_by_method", {
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getFrequentNotes(supabase: Client, range: StatsDateRange) {
  const { data, error } = await supabase.rpc("stats_frequent_notes", {
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getExtractionDistribution(supabase: Client, range: StatsDateRange) {
  const { data, error } = await supabase.rpc("stats_extraction_seconds_distribution", {
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({ bucket: r.bucket_seconds, count: r.attempt_count }));
}

export async function getGrindDistribution(supabase: Client, range: StatsDateRange) {
  const { data, error } = await supabase.rpc("stats_grind_setting_distribution", {
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({ bucket: r.grind_setting, count: r.attempt_count }));
}
