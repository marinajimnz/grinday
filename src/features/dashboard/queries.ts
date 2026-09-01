import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

// "Café activo" = the coffee behind the most recent attempt (what you're
// actually brewing right now). Falls back to the most recently touched
// coffee when nothing has been brewed yet.
export async function getDashboardData(supabase: Client) {
  const { data: lastAttempt, error: attemptError } = await supabase
    .from("brew_attempts")
    .select(
      "*, coffee:coffees!brew_attempts_coffee_id_fkey(id, name, roaster, preferred_attempt_id)",
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (attemptError) throw attemptError;

  if (lastAttempt) {
    let preferredAttempt = null;
    if (
      lastAttempt.coffee.preferred_attempt_id &&
      lastAttempt.coffee.preferred_attempt_id !== lastAttempt.id
    ) {
      const { data } = await supabase
        .from("brew_attempts")
        .select("*")
        .eq("id", lastAttempt.coffee.preferred_attempt_id)
        .maybeSingle();
      preferredAttempt = data;
    } else if (lastAttempt.coffee.preferred_attempt_id === lastAttempt.id) {
      preferredAttempt = lastAttempt;
    }

    const { data: targetBag } = await supabase
      .from("coffee_bags")
      .select("id, status")
      .eq("coffee_id", lastAttempt.coffee.id)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });

    return {
      hasAnyCoffee: true,
      lastAttempt,
      activeCoffee: lastAttempt.coffee,
      preferredAttempt,
      targetBagId: targetBag?.find((b) => b.status === "open")?.id ?? targetBag?.[0]?.id ?? null,
    } as const;
  }

  const { data: mostRecentCoffee } = await supabase
    .from("coffees")
    .select("id, name, roaster")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!mostRecentCoffee) {
    return { hasAnyCoffee: false } as const;
  }

  const { data: bag } = await supabase
    .from("coffee_bags")
    .select("id")
    .eq("coffee_id", mostRecentCoffee.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    hasAnyCoffee: true,
    lastAttempt: null,
    activeCoffee: mostRecentCoffee,
    preferredAttempt: null,
    targetBagId: bag?.id ?? null,
  } as const;
}
