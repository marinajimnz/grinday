"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; message: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

// The database decides who may do what (is_admin(): role plus a second
// factor) and validates everything; this maps its refusals to words.
async function call<T>(
  fn: (supabase: Supabase) => PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>,
  revalidate: string[],
): Promise<ActionResult<T>> {
  const dict = getDictionary(await getLocale());
  const t = dict.admin;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticado" };

  const { data, error } = await fn(supabase);
  if (error) {
    const message =
      error.code === "42501"
        ? t.errorNotAllowed
        : error.code === "22023"
          ? t.errorReasonRequired
          : error.code === "23505"
            ? t.errorAlreadyExists
            : error.code === "23514"
              ? t.errorInvalid
              : error.code === "P0002"
                ? t.errorNothingToChange
                : t.errorGeneric;
    return { success: false, message };
  }
  for (const path of revalidate) revalidatePath(path);
  return { success: true, data: data ?? undefined };
}

// ---------------------------------------------------------------- applicant

const applicationSchema = z
  .object({
    businessName: z.string().trim().min(2).max(80),
    website: z.string().trim().max(200),
    instagram: z.string().trim().max(60),
    city: z.string().trim().max(80),
    contactEmail: z.string().trim().toLowerCase().email().max(200),
  })
  .refine((v) => v.website.length > 0 || v.instagram.replace(/^@/, "").length > 0, { message: "link_required" });

export async function startRoasterApplicationAction(input: unknown): Promise<ActionResult<string>> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    const t = getDictionary(await getLocale()).roaster;
    const linkMissing = parsed.error.issues.some((issue) => issue.message === "link_required");
    return { success: false, message: linkMissing ? t.linkRequired : t.formInvalid };
  }
  const v = parsed.data;
  return call(
    (supabase) =>
      supabase.rpc("start_roaster_application", {
        p_business_name: v.businessName,
        p_website: v.website,
        p_instagram: v.instagram,
        p_city: v.city,
        p_contact_email: v.contactEmail,
      }),
    ["/settings/roaster"],
  );
}

export async function submitRoasterApplicationAction(): Promise<ActionResult> {
  return call((supabase) => supabase.rpc("submit_roaster_application"), ["/settings/roaster"]);
}

// -------------------------------------------------------------------- admin

const ADMIN_PATHS = ["/admin"];
const reason = z.string().trim().min(1).max(500);
const username = z.string().trim().toLowerCase().max(40);

export async function reviewApplicationAction(input: {
  applicationId: string;
  approve: boolean;
  reason: string;
}): Promise<ActionResult> {
  const parsed = z
    .object({ applicationId: z.string().uuid(), approve: z.boolean(), reason })
    .safeParse(input);
  if (!parsed.success) return { success: false, message: getDictionary(await getLocale()).admin.errorReasonRequired };
  return call(
    (supabase) =>
      supabase.rpc("admin_review_roaster_application", {
        p_application_id: parsed.data.applicationId,
        p_approve: parsed.data.approve,
        p_reason: parsed.data.reason,
      }),
    ADMIN_PATHS,
  );
}

export type ProfileModeration = "suspend" | "reactivate" | "revoke_roaster" | "reassign_username";

export async function moderateProfileAction(input: {
  username: string;
  action: ProfileModeration;
  reason: string;
}): Promise<ActionResult<string>> {
  const parsed = z
    .object({
      username,
      action: z.enum(["suspend", "reactivate", "revoke_roaster", "reassign_username"]),
      reason,
    })
    .safeParse(input);
  if (!parsed.success) return { success: false, message: getDictionary(await getLocale()).admin.errorReasonRequired };
  const { username: target, action, reason: why } = parsed.data;
  return call<string>((supabase) => {
    switch (action) {
      case "suspend":
      case "reactivate":
        return supabase
          .rpc("admin_set_suspended", { p_username: target, p_suspended: action === "suspend", p_reason: why })
          .then(({ error }) => ({ data: null, error }));
      case "revoke_roaster":
        return supabase
          .rpc("admin_revoke_roaster", { p_username: target, p_reason: why })
          .then(({ error }) => ({ data: null, error }));
      case "reassign_username":
        return supabase.rpc("admin_reassign_username", { p_username: target, p_reason: why });
    }
  }, ADMIN_PATHS);
}

export async function reserveHandleAction(input: { handle: string; reason: string }): Promise<ActionResult> {
  const parsed = z
    .object({ handle: z
        .string()
        .trim()
        .toLowerCase()
        .transform((v) => v.replace(/^@+/, ""))
        .pipe(z.string().regex(/^[a-z0-9_-]{3,30}$/)), reason })
    .safeParse(input);
  if (!parsed.success) return { success: false, message: getDictionary(await getLocale()).admin.errorInvalid };
  return call(
    (supabase) => supabase.rpc("admin_reserve_handle", { p_handle: parsed.data.handle, p_reason: parsed.data.reason }),
    ADMIN_PATHS,
  );
}

export async function unreserveHandleAction(input: { handle: string; reason: string }): Promise<ActionResult> {
  const parsed = z.object({ handle: z.string().trim().max(40), reason }).safeParse(input);
  if (!parsed.success) return { success: false, message: getDictionary(await getLocale()).admin.errorReasonRequired };
  return call(
    (supabase) => supabase.rpc("admin_unreserve_handle", { p_handle: parsed.data.handle, p_reason: parsed.data.reason }),
    ADMIN_PATHS,
  );
}
