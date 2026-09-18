"use client";

import { useState, useTransition } from "react";
import { Field, inputClassName } from "@/components/ui/Field";
import { changeEmailAction } from "@/features/account/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Button } from "@/components/ui/Button";

export function ChangeEmailForm() {
  const dict = useDictionary();
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await changeEmailAction({ newEmail: email });
          if (!result.success) {
            setError(result.message);
            return;
          }
          setSaved(true);
          setEmail("");
        });
      }}
    >
      <Field label={dict.settings.newEmail} htmlFor="change-email">
        <input
          id="change-email"
          type="email"
          className={inputClassName}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSaved(false);
          }}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-ink-muted">{dict.settings.emailChanged}</p>}

      <Button type="submit" disabled={isPending}>
        <LoadingLabel loading={isPending}>{dict.common.save}</LoadingLabel>
      </Button>
    </form>
  );
}
