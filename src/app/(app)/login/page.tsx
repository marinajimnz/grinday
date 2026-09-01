import { LoginForm } from "@/components/settings/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Si ya vinculaste tu diario a un email en otro dispositivo, entra aquí para recuperarlo.
      </p>
      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <LoginForm />
      </div>
    </div>
  );
}
