"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { METHOD_ICONS } from "@/features/equipment/methodIcons";
import { IconArchivar, IconCafe, IconEliminar, IconFavorita, IconPreparar } from "@/components/icons/pencil-icons";
import type { RecentAttempt } from "@/features/dashboard/queries";
import type { BrewMethod } from "@/features/equipment/constants";
import { useDictionary, useLocale } from "@/components/i18n/LocaleProvider";
import { formatRelativeDay } from "@/lib/i18n/format-date";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
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

function formatSummary(attempt: RecentAttempt, noRecipeData: string) {
  const parts: string[] = [];
  if (attempt.dose_g != null) {
    const weight = attempt.output_weight_g ?? attempt.target_weight_g ?? attempt.water_g;
    if (weight != null && weight > 0) {
      parts.push(`${attempt.dose_g} g → ${weight} g · 1:${(weight / attempt.dose_g).toFixed(1)}`);
    } else {
      parts.push(`${attempt.dose_g} g`);
    }
  }
  if (attempt.coffee?.name) parts.push(attempt.coffee.name);
  return parts.length ? parts.join(" · ") : noRecipeData;
}

// iOS Safari doesn't reliably fire a "contextmenu" DOM event for a
// touch-and-hold on a plain link (unlike Android Chrome, where it does) —
// -webkit-touch-callout:none (set globally) already stops the native
// share/copy callout from stealing the gesture, so timing our own hold via
// pointer events works consistently everywhere instead of depending on
// contextmenu at all. Right-click still opens it instantly on desktop.
const HOLD_DELAY_MS = 500;
const MOVE_CANCEL_PX = 10;

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

  const method = (attempt.method as BrewMethod) ?? "espresso";
  const Icon = METHOD_ICONS[method] ?? IconCafe;
  const duration = formatDuration(attempt.extraction_ms);

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  function clearHoldTimer() {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
  }
  useEffect(() => clearHoldTimer, []);

  function openMenu() {
    setError(null);
    setMenuOpen(true);
  }

  function handlePointerDown(e: React.PointerEvent) {
    // Right mouse button already opens the menu instantly via onContextMenu
    // below — don't also start a hold timer for it.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    heldRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    clearHoldTimer();
    holdTimeoutRef.current = setTimeout(() => {
      heldRef.current = true;
      openMenu();
    }, HOLD_DELAY_MS);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const start = startPosRef.current;
    if (!start) return;
    // Scrolling the list shouldn't be mistaken for a long press.
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX) {
      clearHoldTimer();
    }
  }

  function handleClick(e: React.MouseEvent) {
    // The hold already opened the menu — the click that fires on release
    // would otherwise also navigate to the attempt underneath it.
    if (heldRef.current) {
      e.preventDefault();
      heldRef.current = false;
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    openMenu();
  }

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

  function handleRemoveFromDashboard() {
    setError(null);
    startTransition(async () => {
      const result = await setAttemptDashboardVisibilityAction({ attemptId: attempt.id, hidden: true });
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
      <Link
        href={`/attempts/${attempt.id}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={clearHoldTimer}
        onPointerCancel={clearHoldTimer}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 select-none"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-canvas text-ink">
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
              <p role="alert" className="px-3 pb-1 pt-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={handlePrepare}
              className="flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium text-ink disabled:opacity-60"
            >
              <IconPreparar aria-hidden className="size-5" />
              <LoadingLabel loading={isPending}>{dict.dashboard.prepare}</LoadingLabel>
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleRemoveFromDashboard}
              className="flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium text-ink disabled:opacity-60"
            >
              <IconArchivar aria-hidden className="size-5" />
              {dict.dashboard.removeFromDashboard}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setMenuOpen(false);
                setConfirmDeleteOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium text-red-700 disabled:opacity-60"
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
