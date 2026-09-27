import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { assuranceLevelOf } from "@/lib/supabase/mfa";

type Client = SupabaseClient<Database>;

export type MyRoasterApplication = {
  status: "awaiting_code" | "pending" | "approved" | "rejected";
  businessName: string;
  website: string | null;
  instagram: string | null;
  verificationCode: string;
  reason: string | null;
};

/** The caller's latest roaster application, if any (RLS: own rows only). */
export async function getMyRoasterApplication(supabase: Client, userId: string): Promise<MyRoasterApplication | null> {
  const { data, error } = await supabase
    .from("roaster_applications")
    .select("status, business_name, website, instagram, verification_code, reason")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    status: data.status as MyRoasterApplication["status"],
    businessName: data.business_name,
    website: data.website,
    instagram: data.instagram,
    verificationCode: data.verification_code,
    reason: data.reason,
  };
}

export type ModerationNotice = { action: string; reason: string; createdAt: string };

export async function getMyModerationNotices(supabase: Client): Promise<ModerationNotice[]> {
  const { data, error } = await supabase.rpc("get_my_moderation_notices");
  if (error) throw error;
  return (data ?? []).map((row) => ({ action: row.action, reason: row.reason, createdAt: row.created_at }));
}

/**
 * Whether this request may use /admin: the admin role, and a session that
 * passed the second factor — what is_admin() demands in the database. The
 * page checks it too so it can say what's missing instead of failing.
 */
export async function getAdminAccess(supabase: Client, userId: string): Promise<"ok" | "needs_mfa" | "denied"> {
  const [{ data: profile }, { data: sessionData }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).single(),
    supabase.auth.getSession(),
  ]);
  if (profile?.role !== "admin") return "denied";
  return assuranceLevelOf(sessionData.session?.access_token) === "aal2" ? "ok" : "needs_mfa";
}
