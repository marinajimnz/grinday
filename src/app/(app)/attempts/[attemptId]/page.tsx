import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { IconFavorita } from "@/components/icons/pencil-icons";
import { createClient } from "@/lib/supabase/server";
import { getAttempt, getAttemptMedia } from "@/features/attempts/queries";
import { AttemptDetailPanel } from "@/components/attempt/AttemptDetailPanel";
import { AttemptMediaSection } from "@/components/attempt/AttemptMediaSection";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const attempt = await getAttempt(supabase, attemptId, user.id);

  if (!attempt) notFound();

  const [media, recipeSource] = await Promise.all([
    getAttemptMedia(supabase, attemptId),
    attempt.recipe_source_attempt_id
      ? supabase
          .rpc("get_recipe_source", { p_attempt_id: attemptId })
          .then(({ data }) => data?.[0] ?? null)
      : Promise.resolve(null),
  ]);
  const dict = getDictionary(await getLocale());

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <Link
        href={`/coffees/${attempt.coffee.id}`}
        className="inline-flex items-center gap-1 text-sm text-ink-muted"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {attempt.coffee.roaster} · {attempt.coffee.name}
      </Link>

      {/* Brewed from someone else's public recipe. Credited by name only
          while their profile and that recipe are still public. */}
      {attempt.recipe_source_attempt_id && (
        <p className="mt-3 flex items-center gap-1 text-sm text-coffee">
          <IconFavorita aria-hidden className="size-3.5" />
          {recipeSource?.available && recipeSource.username && recipeSource.source_attempt_id ? (
            <Link
              href={`/u/${recipeSource.username}/attempts/${recipeSource.source_attempt_id}`}
              className="underline"
            >
              {dict.publicProfile.recipeBy.replace("{username}", recipeSource.username)}
            </Link>
          ) : (
            dict.publicProfile.recipeCopied
          )}
        </p>
      )}

      <div className="mt-4">
        <AttemptDetailPanel
          attempt={attempt}
          coffeeId={attempt.coffee.id}
          isPreferred={attempt.coffee.preferred_attempt_id === attempt.id}
        />
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl text-ink">{dict.attempts.photosTitle}</h2>
        <div className="mt-3">
          <AttemptMediaSection attemptId={attemptId} media={media} />
        </div>
      </div>
    </div>
  );
}
