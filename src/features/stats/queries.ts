import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { STATS_TIME_ZONE } from "./period";

type Client = SupabaseClient<Database>;

export type StatsDateRange = { from?: string; to?: string };

export type CoffeeStatRow = Database["public"]["Functions"]["stats_by_coffee"]["Returns"][number];
export type DimensionStatRow =
  Database["public"]["Functions"]["stats_by_dimension"]["Returns"][number];
export type MethodStatRow = Database["public"]["Functions"]["stats_by_method"]["Returns"][number];
export type NoteStatRow = Database["public"]["Functions"]["stats_frequent_notes"]["Returns"][number];
export type BucketStatRow = { bucket: number; count: number };

export type CupTotals = { cups: number; brews: number };
export type CupBucket = { bucketStart: string; cups: number };
export type PeriodHighlights =
  Database["public"]["Functions"]["stats_period_highlights"]["Returns"][number];

export type StatsDimension = "country" | "process" | "roast_level" | "roaster";

export async function getTotalRatedAttempts(supabase: Client, userId: string, range: StatsDateRange) {
  let query = supabase
    .from("brew_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
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
    p_tz: STATS_TIME_ZONE,
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
    p_tz: STATS_TIME_ZONE,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getStatsByMethod(supabase: Client, range: StatsDateRange) {
  const { data, error } = await supabase.rpc("stats_by_method", {
    p_from: range.from,
    p_to: range.to,
    p_tz: STATS_TIME_ZONE,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getFrequentNotes(supabase: Client, range: StatsDateRange) {
  const { data, error } = await supabase.rpc("stats_frequent_notes", {
    p_from: range.from,
    p_to: range.to,
    p_tz: STATS_TIME_ZONE,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getExtractionDistribution(supabase: Client, range: StatsDateRange) {
  const { data, error } = await supabase.rpc("stats_extraction_seconds_distribution", {
    p_from: range.from,
    p_to: range.to,
    p_tz: STATS_TIME_ZONE,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({ bucket: r.bucket_seconds, count: r.attempt_count }));
}

export async function getGrindDistribution(supabase: Client, range: StatsDateRange) {
  const { data, error } = await supabase.rpc("stats_grind_setting_distribution", {
    p_from: range.from,
    p_to: range.to,
    p_tz: STATS_TIME_ZONE,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({ bucket: r.grind_setting, count: r.attempt_count }));
}

/**
 * How much coffee a period actually held. Unlike every function above it,
 * this one needs no ratings and counts archived coffees — see the comment
 * on stats_cup_totals in 0033 for why.
 */
export async function getCupTotals(supabase: Client, range: StatsDateRange): Promise<CupTotals> {
  const { data, error } = await supabase.rpc("stats_cup_totals", {
    p_from: range.from,
    p_to: range.to,
    p_tz: STATS_TIME_ZONE,
  });
  if (error) throw error;
  const row = data?.[0];
  return { cups: Number(row?.cups ?? 0), brews: Number(row?.brews ?? 0) };
}

export async function getCupsByBucket(
  supabase: Client,
  range: Required<StatsDateRange>,
  bucket: "day" | "month",
): Promise<CupBucket[]> {
  const { data, error } = await supabase.rpc("stats_cups_by_bucket", {
    p_from: range.from,
    p_to: range.to,
    p_bucket: bucket,
    p_tz: STATS_TIME_ZONE,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({ bucketStart: r.bucket_start, cups: Number(r.cups) }));
}

export async function getPeriodHighlights(
  supabase: Client,
  range: StatsDateRange,
): Promise<PeriodHighlights | null> {
  const { data, error } = await supabase.rpc("stats_period_highlights", {
    p_from: range.from,
    p_to: range.to,
    p_tz: STATS_TIME_ZONE,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}
