"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Field, inputClassName } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { deleteAccountAction } from "@/features/account/actions";
import { clearDeviceData } from "@/lib/clearDeviceData";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// Last on the page and folded away, so nobody meets it by accident. Two
// things to type, and the button stays disabled until both are there: the
// account's own name, so it can't be the wrong tab, and the password, so it
// can't be someone at an unattended device.
export function DeleteAccountCard({ identifier }: { identifier: string }) {
  const dict = useDictionary();
  const t = dict.settings;
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const ready = confirmation.trim().toLowerCase() === identifier.toLowerCase() && password.length > 0;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        setError(null);
        startDelete(async () => {
          const result = await deleteAccountAction({ confirmation, password });
          if (!result.success) {
            setError(result.message);
            return;
          }
          await clearDeviceData();
          router.replace("/login?accountDeleted=1");
          router.refresh();
        });
      }}
    >
      <p className="text-sm text-ink-muted">{t.deleteAccountDescription}</p>
      <a href="/api/export?format=json" className="inline-flex items-center gap-1.5 text-sm text-ink underline">
        <Download aria-hidden className="size-4" />
        {t.deleteAccountExportFirst}
      </a>

      <Field label={t.deleteAccountConfirmLabel.replace("{identifier}", identifier)} htmlFor="delete-account-confirm">
        <input
          id="delete-account-confirm"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className={inputClassName}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </Field>
      <Field label={t.currentPassword} htmlFor="delete-account-password">
        <input
          id="delete-account-password"
          type="password"
          autoComplete="current-password"
          className={inputClassName}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" variant="destructive" disabled={!ready || isDeleting}>
        <LoadingLabel loading={isDeleting} loadingText={t.deleting}>
          {t.deleteAccountButton}
        </LoadingLabel>
      </Button>
    </form>
  );
}
