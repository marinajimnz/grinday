"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClassName } from "@/components/ui/Field";
import { registerAction } from "@/features/auth/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function RegisterForm() {
  const router = useRouter();
  const dict = useDictionary();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setErrorField(null);

        const result = await registerAction({ name, username, email, password });
        if (!result.success) {
          setIsSubmitting(false);
          setError(result.message);
          setErrorField(result.field ?? null);
          return;
        }

        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
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
      <Field
        label={dict.register.name}
        htmlFor="register-name"
        error={errorField === "name" ? error ?? undefined : undefined}
      >
        <input
          id="register-name"
          type="text"
          required
          autoComplete="name"
          maxLength={60}
          className={inputClassName}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field
        label={dict.register.username}
        htmlFor="register-username"
        error={errorField === "username" ? error ?? undefined : undefined}
      >
        <input
          id="register-username"
          type="text"
          required
          autoComplete="username"
          maxLength={20}
          className={inputClassName}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </Field>
      <Field
        label={dict.register.email}
        htmlFor="register-email"
        error={errorField === "email" ? error ?? undefined : undefined}
      >
        <input
          id="register-email"
          type="email"
          required
          autoComplete="email"
          className={inputClassName}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field
        label={dict.register.password}
        htmlFor="register-password"
        error={errorField === "password" ? error ?? undefined : undefined}
      >
        <input
          id="register-password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          className={inputClassName}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error && !errorField && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 w-full rounded-input bg-ink px-4 text-sm font-medium text-surface disabled:opacity-60"
      >
        {isSubmitting ? dict.register.submitting : dict.register.submit}
      </button>

      <p className="text-center text-sm text-ink-muted">
        {dict.register.alreadyHavePrompt}{" "}
        <Link href="/login" className="font-medium text-ink underline">
          {dict.register.alreadyHaveCta}
        </Link>
      </p>
    </form>
  );
}
