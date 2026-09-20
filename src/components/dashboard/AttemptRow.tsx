"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { METHOD_ICONS } from "@/features/equipment/methodIcons";
import {
  IconAnadir,
  IconArchivar,
  IconCafe,
  IconEliminar,
  IconPreparar,
} from "@/components/icons/pencil-icons";
import { BrewSummary } from "@/components/attempt/BrewSummary";
import { StarRating } from "@/components/ui/StarRating";
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
            {/* The stars sit up here with the method and the day rather
                than in a column of their own: down the right they squeezed
                the line that carries the actual numbers, and they read as a
                heading for the row anyway. */}
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
              <span className="ml-auto shrink-0">
                <StarRating value={attempt.overall_rating} size="sm" />
              </span>
            </div>
            {attempt.coffee?.name && (
              <p className="mt-0.5 truncate text-sm text-ink-muted">{attempt.coffee.name}</p>
            )}
            {/* Cups, dose against ratio, and the clock — the three numbers
                that say what this brew was, in the same shape the preferred
                recipe card shows them. The time moves here from the right
                column, where it sat under the stars as if it were part of
                the rating. */}
            <BrewSummary attempt={attempt} dict={dict} className="mt-1" />
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
