"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClassName } from "@/components/ui/Field";
import { resolveLoginEmailAction } from "@/features/auth/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";

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

      <p className="text-right text-sm">
        <Link href="/forgot-password" className="text-ink-muted underline">
          {dict.login.forgotPasswordLink}
        </Link>
      </p>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} fullWidth>
        {isSubmitting ? dict.login.submitting : dict.login.submit}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        {dict.login.newHerePrompt}{" "}
        <Link href="/register" className="font-medium text-ink underline">
          {dict.login.newHereCta}
        </Link>
      </p>
    </form>
  );
}
