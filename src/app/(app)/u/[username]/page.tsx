import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfileByUsername } from "@/features/profile/publicQueries";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileCoffeeGrid } from "@/components/profile/ProfileCoffeeGrid";
import { ProfileEquipmentList } from "@/components/profile/ProfileEquipmentList";
import { ProfileRecentAttempts } from "@/components/profile/ProfileRecentAttempts";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  const data = await getPublicProfileByUsername(supabase, username.toLowerCase());

  if (!data) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <ProfileHeader profile={data.profile} dict={dict} />

      <section className="mt-8">
        <h2 className="font-display text-xl text-ink">{dict.profile.coffeesTitle}</h2>
        <div className="mt-3">
          <ProfileCoffeeGrid coffees={data.coffees} dict={dict} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl text-ink">{dict.profile.equipmentTitle}</h2>
        <div className="mt-3">
          <ProfileEquipmentList equipment={data.equipment} dict={dict} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl text-ink">{dict.profile.recentActivityTitle}</h2>
        <div className="mt-3">
          <ProfileRecentAttempts attempts={data.recentAttempts} dict={dict} locale={locale} />
        </div>
      </section>
    </div>
  );
}
