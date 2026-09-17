import { createClient } from "@/lib/supabase/client";
import { clearDraft, loadDraft } from "./draft";

// Throwing a draft away has to throw its photo-step uploads away too. Those
// files are already in Storage but no attempt_media row points at them yet,
// so just forgetting the draft would strand one file per abandoned brew with
// nothing left that even knows its path.
//
// This lives outside draft.ts on purpose: that module is deliberately
// network-free (it's what makes a draft survive a dead connection), and this
// is the one draft operation that isn't.
//
// Not for the save path — there the photos have just been attached to a real
// attempt, so BrewLiveScreen clears the draft with clearDraft directly.
export async function discardDraft(draftId: string) {
  const paths = (loadDraft(draftId)?.photos ?? []).map((p) => p.storagePath);

  if (paths.length) {
    // Best-effort: a file we couldn't delete is invisible to the user
    // anyway, and shouldn't stop the draft itself from going away.
    const { error } = await createClient().storage.from("coffee-photos").remove(paths);
    if (error) console.error("[brew-draft] failed to delete discarded photos:", error.message);
  }

  clearDraft(draftId);
}
