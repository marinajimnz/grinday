import { notFound } from "next/navigation";
import { IconFavorito } from "@/components/icons/pencil-icons";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/ui/BackButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

// Your private list of saved profiles. Only the page for now, so the
// button on Home leads somewhere; saving profiles (and the list itself)
// arrives with F5.
export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: socialEnabled } = await supabase.rpc("social_enabled_for_me");
  if (!socialEnabled) notFound();

  const dict = getDictionary(await getLocale());
  const t = dict.favorites;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-2">
        <BackButton label={dict.publicProfile.back} />
        <h1 className="font-display text-2xl text-ink">{t.title}</h1>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{t.subtitle}</p>

      <div className="mt-6">
        <EmptyState
          icon={IconFavorito}
          title={t.emptyTitle}
          description={t.emptyBody}
          action={
            <Button href="/search" variant="secondary" className="mt-2">
              {t.searchCta}
            </Button>
          }
        />
      </div>
    </div>
  );
}
