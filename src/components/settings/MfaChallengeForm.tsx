"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClassName } from "@/components/ui/Field";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";

export function MfaChallengeForm() {
  const router = useRouter();
  const dict = useDictionary();
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const supabase = createClient();
        const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
        const factor = factors?.totp[0];
        if (listError || !factor) {
          setIsSubmitting(false);
          setError(dict.mfa.error);
          return;
        }

        const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
          factorId: factor.id,
          code: code.trim(),
        });
        if (verifyError) {
          setIsSubmitting(false);
          setCode("");
          setError(dict.mfa.invalid);
          return;
        }
        router.push("/");
        router.refresh();
      }}
    >
      <Field label={dict.mfa.code} htmlFor="mfa-code">
        <input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          className={inputClassName}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isSubmitting || code.length !== 6}>
        <LoadingLabel loading={isSubmitting} loadingText={dict.mfa.submitting}>
          {dict.mfa.submit}
        </LoadingLabel>
      </Button>
    </form>
  );
}
