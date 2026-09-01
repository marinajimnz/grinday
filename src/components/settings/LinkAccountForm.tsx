"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClassName } from "@/components/ui/Field";

export function LinkAccountForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p className="text-sm text-ink">
        Te hemos enviado un email de confirmación a <strong>{email}</strong>. Haz clic en el
        enlace para terminar de vincular tu cuenta — hasta entonces sigues usando el diario como
        invitado, sin perder nada.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({ email, password });
        setIsSubmitting(false);
        if (updateError) {
          setError(updateError.message);
          return;
        }
        setSent(true);
      }}
    >
      <Field label="Email" htmlFor="link-email">
        <input
          id="link-email"
          type="email"
          required
          autoComplete="email"
          className={inputClassName}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Contraseña" htmlFor="link-password" hint="Mínimo 6 caracteres">
        <input
          id="link-password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className={inputClassName}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 w-full rounded-input bg-ink px-4 text-sm font-medium text-surface disabled:opacity-60 sm:w-auto"
      >
        {isSubmitting ? "Vinculando..." : "Vincular cuenta"}
      </button>
    </form>
  );
}
