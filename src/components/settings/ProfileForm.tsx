"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Field, inputClassName } from "@/components/ui/Field";
import { updateProfileAction } from "@/features/profile/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";

const ROLE_LABELS: Record<string, string> = { admin: "Admin" };

export function ProfileForm({
  initialDisplayName,
  role,
  loginIdentifier,
}: {
  initialDisplayName: string;
  role: string;
  loginIdentifier: string;
}) {
  const dict = useDictionary();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await updateProfileAction({ displayName });
          if (!result.success) {
            setError(result.message);
            return;
          }
          setSaved(true);
        });
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink">
          <ShieldCheck aria-hidden className="size-3.5" />
          {ROLE_LABELS[role] ?? role}
        </span>
        <span className="text-xs text-ink-muted">
          {dict.settings.signedInAs} {loginIdentifier}
        </span>
      </div>

      <Field label={dict.settings.name} htmlFor="profile-display-name">
        <input
          id="profile-display-name"
          className={inputClassName}
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setSaved(false);
          }}
          maxLength={60}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-ink-muted">{dict.common.saved}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 rounded-input bg-ink px-4 text-sm font-medium text-surface disabled:opacity-60"
      >
        {isPending ? dict.common.saving : dict.common.save}
      </button>
    </form>
  );
}
