"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClassName } from "@/components/ui/Field";
import { resolveLoginEmailAction } from "@/features/auth/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoginLanguageToggle } from "@/components/i18n/LoginLanguageToggle";

export function LoginForm() {
  const router = useRouter();
  const dict = useDictionary();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const resolved = await resolveLoginEmailAction(identifier);
        if (!resolved.success) {
          setIsSubmitting(false);
          setError(resolved.message);
          return;
        }

        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: resolved.email,
          password,
        });
        setIsSubmitting(false);
        if (signInError) {
          setError(dict.login.error);
          return;
        }
        router.push("/");
        router.refresh();
      }}
    >
      <Field label={dict.login.identifier} htmlFor="login-identifier">
        <input
          id="login-identifier"
          type="text"
          required
          autoComplete="username"
          className={inputClassName}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </Field>
      <Field label={dict.login.password} htmlFor="login-password">
        <input
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClassName}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <LoginLanguageToggle />

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 w-full rounded-input bg-ink px-4 text-sm font-medium text-surface disabled:opacity-60"
      >
        {isSubmitting ? dict.login.submitting : dict.login.submit}
      </button>
    </form>
  );
}
