import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ProfileLanguageToggle } from "@/components/settings/ProfileLanguageToggle";
import { getMyPublicIdentity } from "@/features/profile/queries";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Every other authed page guards instead of asserting. Without it a
  // session that's gone by the time this renders — expired, signed out in
  // another tab, or the account itself deleted — turns the proxy's clean
  // redirect to /login into a 500 on `user!.id`.
  if (!user) notFound();
  const dict = getDictionary(await getLocale());

  const [{ data: profile }, identity] = await Promise.all([
    supabase.from("profiles").select("display_name, role, username").eq("id", user.id).single(),
    getMyPublicIdentity(supabase, user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{dict.settings.profileTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{dict.settings.profileSubtitle}</p>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <ProfileForm
          initialDisplayName={profile?.display_name ?? ""}
          role={profile?.role ?? "admin"}
          loginIdentifier={profile?.username ?? user?.email ?? ""}
          publicFields={identity.socialEnabled ? { handle: identity.handle, bio: identity.bio } : undefined}
        />
      </div>

      <div className="mt-6 rounded-card border border-border bg-surface p-5">
        <p className="text-sm font-medium text-ink">{dict.language.label}</p>
        <div className="mt-4">
          <ProfileLanguageToggle />
        </div>
      </div>
    </div>
  );
}
