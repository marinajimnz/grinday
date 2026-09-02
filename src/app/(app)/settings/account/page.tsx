import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const dict = getDictionary(await getLocale());

  // Show the username when one is set (e.g. "admin") — its email is a
  // synthetic address that only exists to satisfy Supabase Auth internally
  // and was never meant to be user-visible.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user!.id)
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

      <div className="mt-6 rounded-card border border-border bg-surface p-5">
        <p className="text-sm font-medium text-ink">{dict.settings.exportData}</p>
        <p className="mt-1 text-sm text-ink-muted">{dict.settings.exportDescription}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/export?format=json"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-input bg-ink px-4 text-sm font-medium text-surface"
          >
            <Download aria-hidden className="size-4" />
            {dict.settings.downloadJson}
          </a>
          <a
            href="/api/export?format=csv"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-4 text-sm font-medium text-ink"
          >
            <Download aria-hidden className="size-4" />
            {dict.settings.downloadCsv}
          </a>
        </div>
      </div>
    </div>
  );
}
