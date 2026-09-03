"use client";

import { useState, useTransition } from "react";
import { Field, inputClassName } from "@/components/ui/Field";
import { changeUsernameAction } from "@/features/account/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";

export function ChangeUsernameForm({ currentUsername }: { currentUsername: string | null }) {
  const dict = useDictionary();
  const [username, setUsername] = useState(currentUsername ?? "");
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
          const result = await changeUsernameAction({ newUsername: username });
          if (!result.success) {
            setError(result.message);
            return;
          }
          setSaved(true);
        });
      }}
    >
      <Field label={dict.settings.newUsername} htmlFor="change-username">
        <input
          id="change-username"
          className={inputClassName}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setSaved(false);
          }}
          maxLength={20}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-ink-muted">{dict.settings.usernameChanged}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 rounded-input bg-ink px-4 text-sm font-medium text-surface disabled:opacity-60"
      >
        <LoadingLabel loading={isPending}>{dict.common.save}</LoadingLabel>
      </button>
    </form>
  );
}
