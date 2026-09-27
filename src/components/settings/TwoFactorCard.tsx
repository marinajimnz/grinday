"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClassName } from "@/components/ui/Field";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";

type State =
  | { step: "loading" }
  | { step: "off" }
  | { step: "enrolling"; factorId: string; qrCode: string; secret: string }
  | { step: "on"; justEnabled: boolean };

// Two-step verification with an authenticator app (TOTP). Shown only to
// admins: their moderation powers need a session that passed it (aal2 — see
// is_admin() in the database), and it's the one thing that keeps a leaked
// password from being enough. Turning it off isn't offered here on purpose;
// losing the app is handled from the Supabase dashboard.
export function TwoFactorCard() {
  const router = useRouter();
  const dict = useDictionary();
  const [state, setState] = useState<State>({ step: "loading" });
  const [code, setCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.mfa.listFactors()
      .then(({ data }) => {
        if (cancelled) return;
        setState(data?.totp.length ? { step: "on", justEnabled: false } : { step: "off" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function startEnrolling() {
    setIsBusy(true);
    setError(null);
    const supabase = createClient();

    // A setup abandoned halfway leaves an unverified factor behind, and
    // enrolling again under the same name would fail on it.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      if (factor.status === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Grindaily",
    });
    setIsBusy(false);
    if (enrollError || !data) {
      setError(dict.settings.twoFactorError);
      return;
    }
    setState({ step: "enrolling", factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(factorId: string) {
    setIsBusy(true);
    setError(null);
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });
    setIsBusy(false);
    if (verifyError) {
      setCode("");
      setError(dict.settings.twoFactorCodeInvalid);
      return;
    }
    setCode("");
    setState({ step: "on", justEnabled: true });
    router.refresh();
  }

  async function cancel(factorId: string) {
    setIsBusy(true);
    await createClient().auth.mfa.unenroll({ factorId });
    setIsBusy(false);
    setCode("");
    setError(null);
    setState({ step: "off" });
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink">{dict.settings.twoFactorTitle}</p>
        {state.step === "on" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink">
            <ShieldCheck aria-hidden className="size-3.5" />
            {dict.settings.twoFactorEnabled}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-muted">{dict.settings.twoFactorDescription}</p>

      {state.step === "off" && (
        <div className="mt-4">
          <Button type="button" onClick={startEnrolling} disabled={isBusy}>
            <LoadingLabel loading={isBusy}>{dict.settings.twoFactorEnable}</LoadingLabel>
          </Button>
        </div>
      )}

      {state.step === "on" && state.justEnabled && (
        <p role="status" className="mt-4 text-sm text-ink-muted">
          {dict.settings.twoFactorEnabledMessage}
        </p>
      )}

      {state.step === "enrolling" && (
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm(state.factorId);
          }}
        >
          <p className="text-sm text-ink">{dict.settings.twoFactorScan}</p>
          {/* Supabase hands the QR back as an SVG data URL. It sits on a white
              tile in both themes: scanners need dark-on-light. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.qrCode}
            alt={dict.settings.twoFactorQrAlt}
            className="size-44 rounded-input bg-white p-2"
          />
          <p className="text-sm text-ink-muted">
            {dict.settings.twoFactorSecretLabel}:{" "}
            <code className="select-all break-all font-mono text-ink">{state.secret}</code>
          </p>
          <Field label={dict.settings.twoFactorCodeLabel} htmlFor="two-factor-code">
            <input
              id="two-factor-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              className={inputClassName}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isBusy || code.length !== 6}>
              <LoadingLabel loading={isBusy} loadingText={dict.settings.twoFactorConfirming}>
                {dict.settings.twoFactorConfirm}
              </LoadingLabel>
            </Button>
            <Button type="button" variant="secondary" onClick={() => cancel(state.factorId)} disabled={isBusy}>
              {dict.settings.twoFactorCancel}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
