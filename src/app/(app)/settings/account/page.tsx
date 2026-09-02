import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/settings/SignOutButton";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      <h1 className="font-display text-3xl text-ink">Cuenta y privacidad</h1>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <p className="text-sm text-ink">
          Cuenta vinculada como <strong>{loginIdentifier}</strong>.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>

      <div className="mt-6 rounded-card border border-border bg-surface p-5">
        <p className="text-sm font-medium text-ink">Exportar tus datos</p>
        <p className="mt-1 text-sm text-ink-muted">
          Una copia de tus cafés, bolsas e intentos. Útil como respaldo manual.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/export?format=json"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-input bg-ink px-4 text-sm font-medium text-surface"
          >
            <Download aria-hidden className="size-4" />
            Descargar JSON
          </a>
          <a
            href="/api/export?format=csv"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-4 text-sm font-medium text-ink"
          >
            <Download aria-hidden className="size-4" />
            Descargar intentos (CSV)
          </a>
        </div>
      </div>
    </div>
  );
}
