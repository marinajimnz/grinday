"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { Field, inputClassName } from "@/components/ui/Field";
import { updateProfileAction } from "@/features/profile/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { IconGrano } from "@/components/icons/pencil-icons";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Button } from "@/components/ui/Button";
import { HandleField } from "@/components/profile/HandleField";
import { BIO_MAX_LENGTH } from "@/lib/validation/profile";

const ROLE_LABELS: Record<string, string> = { admin: "Admin", coffee_lover: "Coffee lover" };
const ROLE_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  admin: ShieldCheck,
  coffee_lover: IconGrano,
};

export function ProfileForm({
  initialDisplayName,
  role,
  loginIdentifier,
  publicFields,
}: {
  initialDisplayName: string;
  role: string;
  loginIdentifier: string;
  // Handle and bio, shown only once the public side is on for this account.
  publicFields?: { handle: string | null; bio: string | null };
}) {
  const dict = useDictionary();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [handle, setHandle] = useState(publicFields?.handle ?? "");
  const [bio, setBio] = useState(publicFields?.bio ?? "");
  const [errorField, setErrorField] = useState<"handle" | "bio" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const RoleIcon = ROLE_ICONS[role] ?? ShieldCheck;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setErrorField(null);
        setSaved(false);
        startTransition(async () => {
          const result = await updateProfileAction(
            publicFields ? { displayName, handle, bio } : { displayName },
          );
          if (!result.success) {
            setError(result.message);
            setErrorField(result.field ?? null);
            return;
          }
          setErrorField(null);
          setSaved(true);
        });
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink">
          <RoleIcon aria-hidden className="size-3.5" />
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

      {publicFields && (
        <>
          <HandleField
            id="profile-handle"
            value={handle}
            onChange={(value) => {
              setHandle(value);
              setSaved(false);
            }}
            error={errorField === "handle" ? error : null}
          />
          <Field
            label={dict.settings.bio}
            htmlFor="profile-bio"
            hint={`${dict.settings.bioHint} ${bio.length}/${BIO_MAX_LENGTH}`}
            error={errorField === "bio" ? error ?? undefined : undefined}
          >
            <textarea
              id="profile-bio"
              rows={3}
              className={`${inputClassName} py-2.5`}
              value={bio}
              maxLength={BIO_MAX_LENGTH}
              onChange={(e) => {
                setBio(e.target.value);
                setSaved(false);
              }}
            />
          </Field>
        </>
      )}

      {error && !errorField && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-ink-muted">{dict.common.saved}</p>}

      <Button type="submit" disabled={isPending}>
        <LoadingLabel loading={isPending}>{dict.common.save}</LoadingLabel>
      </Button>
    </form>
  );
}
