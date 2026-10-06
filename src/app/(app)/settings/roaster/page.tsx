import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyRoasterApplication } from "@/features/moderation/queries";
import { RoasterApplicationPanel } from "@/components/roaster/RoasterApplicationPanel";
import { BackButton } from "@/components/ui/BackButton";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.roaster.title);

// Only for regular accounts (and roasters, to see where they stand), and
// only while the public side is on for them.
export default async function RoasterSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const [{ data: socialEnabled }, { data: profile }] = await Promise.all([
    supabase.rpc("social_enabled_for_me"),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);
  if (!socialEnabled || profile?.role === "admin") notFound();

  const application = await getMyRoasterApplication(supabase, user.id);
  const t = getDictionary(await getLocale()).roaster;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center gap-2">
        <BackButton label={t.title} fallbackHref="/settings" />
        <h1 className="font-display text-3xl text-ink">{t.title}</h1>
      </div>
      <div className="mt-6 rounded-card border border-border bg-surface p-5">
        <RoasterApplicationPanel application={application} />
      </div>
    </div>
  );
}
