"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Field, inputClassName } from "@/components/ui/Field";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const dict = useDictionary();
  const [identifier, setIdentifier] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink">{dict.forgotPassword.sentMessage}</p>
        <Link href="/login" className="text-sm font-medium text-ink underline">
          {dict.login.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await requestPasswordResetAction(identifier);
          if (!result.success) {
            setError(result.message);
            return;
          }
          setSent(true);
        });
      }}
    >
      <Field label={dict.login.identifier} htmlFor="forgot-password-identifier">
        <input
          id="forgot-password-identifier"
          type="text"
          autoComplete="username"
          className={inputClassName}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} fullWidth>
        <LoadingLabel loading={isPending} loadingText={dict.forgotPassword.submitting}>
          {dict.forgotPassword.submit}
        </LoadingLabel>
      </Button>

      <p className="text-center text-sm text-ink-muted">
        <Link href="/login" className="font-medium text-ink underline">
          {dict.login.backToLogin}
        </Link>
      </p>
    </form>
  );
}
