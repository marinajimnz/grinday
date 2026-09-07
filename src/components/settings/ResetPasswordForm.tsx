"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClassName } from "@/components/ui/Field";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Button } from "@/components/ui/Button";

// The recovery link's tokens arrive as a URL hash (implicit flow), but
// @supabase/ssr's browser client always forces flowType "pkce", which makes
// it flag any hash-based callback as a flow mismatch and skip it instead of
// establishing a session — so the hash has to be parsed and applied by hand
// via setSession() here. onAuthStateChange/PASSWORD_RECOVERY and the `code`
// exchange are kept as fallbacks in case that ever changes upstream.
export function ResetPasswordForm() {
  const dict = useDictionary();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [newPassword, setNewPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    async function bootstrapFromLink() {
      // PKCE flow: a `?code=` the SSR client can exchange for a session itself.
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          setStatus((current) => (current === "checking" ? "ready" : current));
          return;
        }
      }

      // Implicit flow: access/refresh tokens arrive in the URL hash, which
      // @supabase/ssr's browser client — built around PKCE — doesn't pick up
      // on its own, so the session is set from them by hand here.
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!setSessionError) {
          setStatus((current) => (current === "checking" ? "ready" : current));
          return;
        }
      }

      // Fallback for when a session (recovery or otherwise) already existed
      // before this ran.
      const { data } = await supabase.auth.getSession();
      setStatus((current) => (current === "checking" && data.session ? "ready" : current));
    }

    bootstrapFromLink();

    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (status === "checking") {
    return <p className="text-sm text-ink-muted">{dict.resetPassword.checkingLink}</p>;
  }

  if (status === "invalid") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700">{dict.resetPassword.invalidLink}</p>
        <Link href="/forgot-password" className="text-sm font-medium text-ink underline">
          {dict.resetPassword.requestNewLink}
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
        if (newPassword.length < 8) {
          setError(dict.register.passwordTooShort);
          return;
        }
        startTransition(async () => {
          const supabase = createClient();
          const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
          if (updateError) {
            setError(updateError.message);
            return;
          }
          router.push("/");
          router.refresh();
        });
      }}
    >
      <Field label={dict.resetPassword.newPassword} htmlFor="reset-password-new">
        <input
          id="reset-password-new"
          type="password"
          autoComplete="new-password"
          className={inputClassName}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} fullWidth>
        <LoadingLabel loading={isPending} loadingText={dict.resetPassword.submitting}>
          {dict.resetPassword.submit}
        </LoadingLabel>
      </Button>
    </form>
  );
}
