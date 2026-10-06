"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import type { ImportCounts } from "@/features/backup/plan";

type State =
  | { step: "idle" }
  | { step: "checking" }
  | { step: "preview"; text: string; counts: ImportCounts }
  | { step: "importing"; text: string; counts: ImportCounts }
  | { step: "done"; counts: ImportCounts }
  | { step: "error"; message: string };

async function post(text: string, dryRun: boolean) {
  const response = await fetch(`/api/import${dryRun ? "?dryRun=1" : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: text,
  });
  const body = (await response.json().catch(() => ({}))) as { counts?: ImportCounts; error?: string };
  return response.ok && body.counts ? { counts: body.counts } : { error: body.error ?? "failed" };
}

// Two steps on purpose: the file is read and checked against the account
// first, and nothing is written until you've seen what would be added.
export function ImportBackupCard() {
  const dict = useDictionary();
  const t = dict.settings;
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: "idle" });

  function errorMessage(error: string) {
    if (error === "invalid_file") return t.importErrorInvalid;
    if (error === "too_large") return t.importErrorTooLarge;
    return t.importErrorFailed;
  }

  async function handleFile(file: File) {
    setState({ step: "checking" });
    const text = await file.text();
    const result = await post(text, true);
    setState(result.counts ? { step: "preview", text, counts: result.counts } : { step: "error", message: errorMessage(result.error) });
  }

  async function handleConfirm() {
    if (state.step !== "preview") return;
    setState({ ...state, step: "importing" });
    const result = await post(state.text, false);
    if (result.counts) {
      setState({ step: "done", counts: result.counts });
      router.refresh();
    } else {
      setState({ step: "error", message: errorMessage(result.error) });
    }
  }

  const counts = state.step === "preview" || state.step === "importing" ? state.counts : null;
  const nothingNew =
    counts !== null && counts.coffees.added + counts.bags.added + counts.attempts.added === 0;
  const skipped = counts ? counts.bags.skipped + counts.attempts.skipped : 0;

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="text-sm font-medium text-ink">{t.importData}</p>
      <p className="mt-1 text-sm text-ink-muted">{t.importDescription}</p>

      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label={t.importChooseFile}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      {counts && (
        <div className="mt-4">
          <p className="text-sm text-ink">{t.importSummary}</p>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                <th className="py-1 font-normal" />
                <th className="py-1 text-right font-normal">{t.importColNew}</th>
                <th className="py-1 text-right font-normal">{t.importColExisting}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums text-ink">
              {(
                [
                  [t.importRowCoffees, counts.coffees],
                  [t.importRowBags, counts.bags],
                  [t.importRowAttempts, counts.attempts],
                ] as const
              ).map(([label, row]) => (
                <tr key={label} className="border-t border-border">
                  <th scope="row" className="py-1.5 text-left font-normal">
                    {label}
                  </th>
                  <td className="py-1.5 text-right font-medium">{row.added}</td>
                  <td className="py-1.5 text-right text-ink-muted">{row.existing}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {skipped > 0 && (
            <p className="mt-2 text-xs text-ink-muted">{skipped === 1 ? t.importSkipped.one : t.importSkipped.many.replace("{count}", String(skipped))}</p>
          )}
          {nothingNew && <p className="mt-2 text-sm text-ink-muted">{t.importNothingNew}</p>}
        </div>
      )}

      {state.step === "done" && (
        <p role="status" className="mt-4 text-sm text-ink">
          {t.importDone}
        </p>
      )}
      {state.step === "error" && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {state.message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {counts && !nothingNew ? (
          <>
            <Button type="button" onClick={handleConfirm} disabled={state.step === "importing"}>
              <LoadingLabel loading={state.step === "importing"} loadingText={t.importing}>
                {t.importConfirm}
              </LoadingLabel>
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={state.step === "importing"}
              onClick={() => setState({ step: "idle" })}
            >
              {dict.common.cancel}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="secondary"
            disabled={state.step === "checking"}
            onClick={() => input.current?.click()}
          >
            <Upload aria-hidden className="size-4" />
            <LoadingLabel loading={state.step === "checking"} loadingText={t.importChecking}>
              {t.importChooseFile}
            </LoadingLabel>
          </Button>
        )}
      </div>
    </div>
  );
}
