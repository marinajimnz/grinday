import Link from "next/link";
import { IconAnadir } from "@/components/icons/pencil-icons";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/locale";

export async function NewBrewCta() {
  const dict = getDictionary(await getLocale());

  return (
    <Link
      href="/brew/new"
      className="flex items-center justify-between gap-4 rounded-card bg-ink p-6 text-surface"
    >
      <span className="font-display text-4xl">{dict.dashboard.newBrew}</span>
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-surface/15">
        <IconAnadir aria-hidden className="size-7" />
      </span>
    </Link>
  );
}
