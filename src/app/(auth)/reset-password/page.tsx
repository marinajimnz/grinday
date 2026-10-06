import { ResetPasswordForm } from "@/components/settings/ResetPasswordForm";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.resetPassword.title);

export default async function ResetPasswordPage() {
  const dict = getDictionary(await getLocale());

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-center text-3xl text-ink">{dict.resetPassword.title}</h1>
      <p className="mt-2 text-center text-sm text-ink-muted">{dict.resetPassword.subtitle}</p>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
