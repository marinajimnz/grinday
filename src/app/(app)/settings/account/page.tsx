import { createClient } from "@/lib/supabase/server";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Cuenta y privacidad</h1>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        {user?.is_anonymous !== false ? (
          <>
            <p className="text-sm font-medium text-ink">
              Estás usando Coffee Journal como invitado.
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Protege tu diario para conservar el acceso si cambias de
              dispositivo o borras los datos del navegador.
            </p>
            <p className="mt-4 text-xs text-ink-muted">
              Vincular email u otra cuenta llegará en una fase posterior, sin
              perder ninguno de tus datos.
            </p>
          </>
        ) : (
          <p className="text-sm text-ink">Cuenta vinculada.</p>
        )}
      </div>
    </div>
  );
}
