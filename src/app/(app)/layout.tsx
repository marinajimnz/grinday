import { AppShell } from "@/components/ui/AppShell";
import { VisibilityPromptGate } from "@/components/profile/VisibilityPromptGate";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <LocaleProvider locale={locale} dict={dict}>
      <AppShell>{children}</AppShell>
      <VisibilityPromptGate />
    </LocaleProvider>
  );
}
