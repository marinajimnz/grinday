import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getMyPublicIdentity } from "@/features/profile/queries";
import { VisibilityPrompt } from "./VisibilityPrompt";

// Mounted once in the app layout. Renders the public/private question only
// for an account that hasn't answered it yet, and only once the public side
// is on for that account — until then there's nothing to decide.
export async function VisibilityPromptGate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const identity = await getMyPublicIdentity(supabase, user.id);
  if (!identity.socialEnabled || identity.visibility !== "unset") return null;

  return (
    // useSearchParams (for ?bienvenida) needs a boundary of its own.
    <Suspense fallback={null}>
      <VisibilityPrompt username={identity.username} />
    </Suspense>
  );
}
