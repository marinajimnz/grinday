import { ForgotPasswordForm } from "@/components/settings/ForgotPasswordForm";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.forgotPassword.title);

export default async function ForgotPasswordPage() {
  const dict = getDictionary(await getLocale());

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-center text-3xl text-ink">{dict.forgotPassword.title}</h1>
      <p className="mt-2 text-center text-sm text-ink-muted">{dict.forgotPassword.subtitle}</p>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
