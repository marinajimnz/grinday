import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { ChangeUsernameForm } from "@/components/settings/ChangeUsernameForm";
import { ChangeEmailForm } from "@/components/settings/ChangeEmailForm";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { SettingsAccordionCard } from "@/components/settings/SettingsAccordionCard";
import { TwoFactorCard } from "@/components/settings/TwoFactorCard";
import { buttonClassName } from "@/components/ui/Button";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.settings.accountTitle);

export default async function AccountSettingsPage() {
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

  // Show the username when one is set (e.g. "admin") — its email is a
  // synthetic address that only exists to satisfy Supabase Auth internally
  // and was never meant to be user-visible.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role, visibility")
    .eq("id", user.id)
    .single();
  const loginIdentifier = profile?.username ?? user?.email;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">{dict.settings.accountTitle}</h1>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <p className="text-sm text-ink">
          {dict.settings.accountLinkedAs} <strong>{loginIdentifier}</strong>.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>

      {profile?.role === "admin" && (
        <div className="mt-6">
          <TwoFactorCard />
        </div>
      )}

      <div className="mt-6 space-y-3">
        <SettingsAccordionCard title={dict.settings.changeUsernameTitle}>
          {profile?.visibility === "public" && (
            <p className="mb-3 text-sm text-ink-muted">{dict.settings.usernamePublicHint}</p>
          )}
          <ChangeUsernameForm currentUsername={profile?.username ?? null} />
        </SettingsAccordionCard>
        <SettingsAccordionCard title={dict.settings.changeEmailTitle}>
          <ChangeEmailForm />
        </SettingsAccordionCard>
        <SettingsAccordionCard title={dict.settings.changePasswordTitle}>
          <ChangePasswordForm />
        </SettingsAccordionCard>
      </div>

      <div className="mt-6 rounded-card border border-border bg-surface p-5">
        <p className="text-sm font-medium text-ink">{dict.settings.exportData}</p>
        <p className="mt-1 text-sm text-ink-muted">{dict.settings.exportDescription}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/api/export?format=json" className={buttonClassName("primary")}>
            <Download aria-hidden className="size-4" />
            {dict.settings.downloadJson}
          </a>
          <a href="/api/export?format=csv" className={buttonClassName("secondary")}>
            <Download aria-hidden className="size-4" />
            {dict.settings.downloadCsv}
          </a>
        </div>
      </div>
    </div>
  );
}
