import { LoginForm } from "@/components/settings/LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-center text-5xl text-ink">grindaily</h1>
      <p className="mt-2 text-center text-sm text-ink-muted">
        Tu diario de café, siempre a mano.
      </p>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <LoginForm />
      </div>
    </div>
  );
}
