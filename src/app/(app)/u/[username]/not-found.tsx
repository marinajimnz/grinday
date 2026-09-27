import { IconPerfil } from "@/components/icons/pencil-icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

// One message for every reason a profile isn't shown — missing, private,
// suspended, or the public side being off — so this page can't be used to
// find out which accounts exist.
export default async function PublicProfileNotFound() {
  const t = getDictionary(await getLocale()).publicProfile;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <EmptyState
        icon={IconPerfil}
        title={t.notFoundTitle}
        description={t.notFoundBody}
        action={
          <Button href="/" variant="secondary" className="mt-2">
            {t.notFoundCta}
          </Button>
        }
      />
    </div>
  );
}
