"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { Field, inputClassName } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { startRoasterApplicationAction, submitRoasterApplicationAction } from "@/features/moderation/actions";
import type { MyRoasterApplication } from "@/features/moderation/queries";

// "I'm a roaster": the form, then the code to publish, then the wait for
// an admin, then the outcome. The code comes from the database; the
// applicant only ever copies it.
export function RoasterApplicationPanel({ application }: { application: MyRoasterApplication | null }) {
  const t = useDictionary().roaster;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [applyingAgain, setApplyingAgain] = useState(false);
  const [form, setForm] = useState({ businessName: "", website: "", instagram: "", city: "", contactEmail: "" });

  const showForm = !application || (application.status === "rejected" && applyingAgain);

  if (showForm) {
    const field = (key: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
      <Field label={label} htmlFor={`roaster-${key}`}>
        <input
          id={`roaster-${key}`}
          className={inputClassName}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          {...props}
        />
      </Field>
    );
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await startRoasterApplicationAction(form);
            if (!result.success) {
              setError(result.message);
              return;
            }
            setApplyingAgain(false);
            router.refresh();
          });
        }}
      >
        <p className="text-sm text-ink-muted">{t.intro}</p>
        {field("businessName", t.businessName, { required: true, maxLength: 80 })}
        {field("website", t.website, { type: "url", placeholder: t.websitePlaceholder, maxLength: 200 })}
        {field("instagram", t.instagram, { placeholder: t.instagramPlaceholder, maxLength: 60, autoCapitalize: "none" })}
        <p className="-mt-2 text-xs text-ink-muted">{t.linkHint}</p>
        {field("city", t.city, { maxLength: 80 })}
        {field("contactEmail", t.contactEmail, { type: "email", required: true, maxLength: 200 })}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isPending}>
          <LoadingLabel loading={isPending} loadingText={t.starting}>
            {t.start}
          </LoadingLabel>
        </Button>
      </form>
    );
  }

  if (application.status === "awaiting_code") {
    return (
      <div className="space-y-4">
        <p className="font-medium text-ink">{t.codeTitle}</p>
        <p className="text-sm text-ink-muted">{t.codeBody}</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-input bg-canvas px-3 py-2.5 font-mono text-base text-ink select-all">
            {application.verificationCode}
          </code>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(application.verificationCode);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
            {copied ? t.copied : t.copy}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await submitRoasterApplicationAction();
              if (!result.success) {
                setError(result.message);
                return;
              }
              router.refresh();
            })
          }
        >
          <LoadingLabel loading={isPending} loadingText={t.publishing}>
            {t.published}
          </LoadingLabel>
        </Button>
      </div>
    );
  }

  if (application.status === "pending") {
    return (
      <div role="status">
        <p className="font-medium text-ink">{t.pendingTitle}</p>
        <p className="mt-1 text-sm text-ink-muted">{t.pendingBody}</p>
      </div>
    );
  }

  if (application.status === "approved") {
    return (
      <div role="status">
        <p className="font-medium text-ink">{t.approvedTitle}</p>
        <p className="mt-1 text-sm text-ink-muted">{t.approvedBody}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-medium text-ink">{t.rejectedTitle}</p>
      {application.reason && (
        <p className="text-sm text-ink-muted">{t.rejectedBody.replace("{reason}", application.reason)}</p>
      )}
      <Button type="button" variant="secondary" onClick={() => setApplyingAgain(true)}>
        {t.applyAgain}
      </Button>
    </div>
  );
}
