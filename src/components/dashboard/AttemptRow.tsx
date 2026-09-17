"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { METHOD_ICONS } from "@/features/equipment/methodIcons";
import {
  IconAnadir,
  IconArchivar,
  IconCafe,
  IconEliminar,
  IconFavorita,
  IconPreparar,
} from "@/components/icons/pencil-icons";
import type { RecentAttempt } from "@/features/dashboard/queries";
import type { BrewMethod } from "@/features/equipment/constants";
import { useDictionary, useLocale } from "@/components/i18n/LocaleProvider";
import { formatRelativeDay } from "@/lib/i18n/format-date";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { useLongPress } from "@/components/ui/useLongPress";
import { buildDraftFromRecipe, saveDraft } from "@/features/brew/draft";
import { startBrewFromAttemptAction } from "@/features/brew/actions";
import { deleteAttemptAction, setAttemptDashboardVisibilityAction } from "@/features/attempts/actions";

function formatDuration(extractionMs: number | null) {
  if (extractionMs == null) return null;
  const totalSeconds = Math.round(extractionMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// The ratio used to be printed here too, between the two weights it's
// computed from and the coffee's name. It cost about fifty pixels on a line
// that was already twenty short of fitting, and it said nothing the "18 g →
// 36 g" beside it didn't: the name is what got cut instead. It also printed
// "1:2.0" where every other ratio in the app reads "1:2" — one fewer place
// to keep in step.
function formatSummary(attempt: RecentAttempt, noRecipeData: string) {
  const parts: string[] = [];
  if (attempt.dose_g != null) {
    const weight = attempt.output_weight_g ?? attempt.target_weight_g ?? attempt.water_g;
    parts.push(
      weight != null && weight > 0 ? `${attempt.dose_g} g → ${weight} g` : `${attempt.dose_g} g`,
    );
  }
  if (attempt.coffee?.name) parts.push(attempt.coffee.name);
  return parts.length ? parts.join(" · ") : noRecipeData;
}

function StarRow({ rating }: { rating: number | null }) {
  if (rating == null) return null;
  return (
    <div className="flex justify-end gap-0.5 text-coffee">
      {[1, 2, 3, 4, 5].map((n) => (
        <IconFavorita key={n} aria-hidden className={cn("size-3", n > rating && "fill-none")} />
      ))}
    </div>
  );
}

export function AttemptRow({ attempt }: { attempt: RecentAttempt }) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ConfirmDialog — which this menu opens one tap later — closes on Escape,
  // so the menu behaving differently made the same gesture mean two things in
  // the same flow. Backdrop-tap was the only way out before.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const method = (attempt.method as BrewMethod) ?? "espresso";
  const Icon = METHOD_ICONS[method] ?? IconCafe;
  const duration = formatDuration(attempt.extraction_ms);

  function openMenu() {
    setError(null);
    setMenuOpen(true);
  }

  const longPress = useLongPress(openMenu);

  function handlePrepare() {
    setError(null);
    startTransition(async () => {
      const result = await startBrewFromAttemptAction({ attemptId: attempt.id });
      if (!result.success) {
        setError(result.message);
        return;
      }
      const draft = buildDraftFromRecipe({
        userId: result.data.userId,
        coffeeId: result.data.coffeeId,
        coffeeBagId: result.data.coffeeBagId,
        coffeeName: result.data.coffeeName,
        roaster: result.data.roaster,
        method,
        sourceAttempt: result.data.sourceAttempt,
      });
      saveDraft(draft);
      setMenuOpen(false);
      router.push(`/brew/live/${draft.draftId}`);
    });
  }

  function handleToggleDashboardVisibility() {
    setError(null);
    startTransition(async () => {
      const result = await setAttemptDashboardVisibilityAction({
        attemptId: attempt.id,
        hidden: !attempt.hidden_from_dashboard,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setMenuOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAttemptAction(attempt.id);
      if (!result.success) {
        setConfirmDeleteOpen(false);
        setError(result.message);
        setMenuOpen(true);
        return;
      }
      setConfirmDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {/* Preparar / archivar / eliminar used to live behind a long press and
          nothing else: no mark on the row said so, and a keyboard couldn't
          perform the gesture at all, so for anyone not holding a finger down
          those three actions did not exist. The hold still works — this is
          the way you can see. */}
      <div className="flex items-stretch rounded-card border border-border bg-surface">
        <Link
          href={`/attempts/${attempt.id}`}
          {...longPress}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-card py-4 pl-4 select-none"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink">
            <Icon aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-ink">
                {dict.equipment.methodLabels[method] ?? attempt.method}
              </span>
              <span className="text-xs text-ink-muted">
                {formatRelativeDay(attempt.created_at, locale, {
                  today: dict.dashboard.today,
                  yesterday: dict.dashboard.yesterday,
                })}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-ink-muted">
              {formatSummary(attempt, dict.dashboard.noRecipeData)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <StarRow rating={attempt.overall_rating} />
            {duration && <p className="mt-0.5 text-xs text-ink-muted">{duration}</p>}
          </div>
        </Link>
        <button
          type="button"
          onClick={openMenu}
          aria-label={dict.dashboard.attemptMenuLabel}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex w-11 shrink-0 items-center justify-center rounded-r-card text-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
        >
          <MoreVertical aria-hidden className="size-5" />
        </button>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setMenuOpen(false)}
        >
          <div
            role="menu"
            aria-label={dict.dashboard.attemptMenuLabel}
            className="w-full max-w-sm rounded-card border border-border bg-surface p-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {error && (
              <p role="alert" className="px-3 pb-1 pt-2 text-sm text-danger">
                {error}
              </p>
            )}
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={handlePrepare}
              className="flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium text-ink disabled:opacity-60"
            >
              <IconPreparar aria-hidden className="size-5" />
              <LoadingLabel loading={isPending}>{dict.dashboard.prepare}</LoadingLabel>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={handleToggleDashboardVisibility}
              className="flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium text-ink disabled:opacity-60"
            >
              {attempt.hidden_from_dashboard ? (
                <IconAnadir aria-hidden className="size-5" />
              ) : (
                <IconArchivar aria-hidden className="size-5" />
              )}
              {attempt.hidden_from_dashboard
                ? dict.dashboard.includeInDashboard
                : dict.dashboard.removeFromDashboard}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={() => {
                setMenuOpen(false);
                setConfirmDeleteOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium text-danger disabled:opacity-60"
            >
              <IconEliminar aria-hidden className="size-5" />
              {dict.common.delete}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="mt-1 w-full rounded-input border border-border px-3 py-3 text-center text-sm font-medium text-ink"
            >
              {dict.common.cancel}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        message={dict.dashboard.deleteAttemptConfirm}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
