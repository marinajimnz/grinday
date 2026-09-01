import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LinkAccountForm } from "@/components/settings/LinkAccountForm";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAnonymous = user?.is_anonymous !== false;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Cuenta y privacidad</h1>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        {isAnonymous ? (
          <>
            <p className="text-sm font-medium text-ink">
              Estás usando Coffee Journal como invitado.
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Protege tu diario para conservar el acceso si cambias de dispositivo o borras los
              datos del navegador. Vincularlo no borra ni mueve nada — sigue siendo el mismo
              diario.
            </p>
            <div className="mt-5">
              <LinkAccountForm />
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              ¿Ya vinculaste tu diario en otro dispositivo?{" "}
              <Link href="/login" className="underline">
                Inicia sesión
              </Link>
              .
            </p>
          </>
        ) : (
          <p className="text-sm text-ink">
            Cuenta vinculada como <strong>{user?.email}</strong>.
          </p>
        )}
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
