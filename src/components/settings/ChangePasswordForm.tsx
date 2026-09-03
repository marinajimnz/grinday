"use client";

import { useState, useTransition } from "react";
import { Field, inputClassName } from "@/components/ui/Field";
import { changePasswordAction } from "@/features/account/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";

export function ChangePasswordForm() {
  const dict = useDictionary();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
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
          const result = await changePasswordAction({ currentPassword, newPassword });
          if (!result.success) {
            setError(result.message);
            return;
          }
          setSaved(true);
          setCurrentPassword("");
          setNewPassword("");
        });
      }}
    >
      <Field label={dict.settings.currentPassword} htmlFor="change-password-current">
        <input
          id="change-password-current"
          type="password"
          autoComplete="current-password"
          className={inputClassName}
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            setSaved(false);
          }}
        />
      </Field>

      <Field label={dict.settings.newPassword} htmlFor="change-password-new">
        <input
          id="change-password-new"
          type="password"
          autoComplete="new-password"
          className={inputClassName}
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setSaved(false);
          }}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-ink-muted">{dict.settings.passwordChanged}</p>}

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
