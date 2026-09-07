"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BagStatusBadge } from "./BagStatusBadge";
import {
  IconArchivar,
  IconCafe as CoffeeIcon,
  IconEliminar,
  IconPreparar,
} from "@/components/icons/pencil-icons";
import { Field, inputClassName } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { type ROAST_LEVELS } from "@/features/coffees/constants";
import { archiveCoffeeAction, deleteCoffeeAction } from "@/features/coffees/actions";
import type { CoffeeListItem } from "@/features/coffees/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

// Same long-press timing as the recipe cards on Inicio/Preparaciones — see
// AttemptRow.tsx for why this is done via pointer events instead of the
// "contextmenu" DOM event (iOS Safari doesn't fire it for a touch-and-hold).
const HOLD_DELAY_MS = 500;
const MOVE_CANCEL_PX = 10;

export function CoffeeCard({ coffee, dict }: { coffee: CoffeeListItem; dict: Dictionary }) {
  const router = useRouter();
  const activeBag = coffee.bags.find((b) => b.status === "open") ?? coffee.bags[0] ?? null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function closeMenu() {
    setMenuOpen(false);
    setDeleteOpen(false);
    setDeleteConfirmName("");
    setError(null);
  }

  function handlePointerDown(e: React.PointerEvent) {
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
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX) {
      clearHoldTimer();
    }
  }

  function handleClick(e: React.MouseEvent) {
    if (heldRef.current) {
      e.preventDefault();
      heldRef.current = false;
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    openMenu();
  }

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveCoffeeAction(coffee.id);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setArchiveConfirmOpen(false);
      closeMenu();
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteCoffeeAction(coffee.id);
      if (!result.success) {
        setError(result.message);
        return;
      }
      closeMenu();
      router.refresh();
    });
  }

  return (
    <>
      <Link
        href={`/coffees/${coffee.id}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={clearHoldTimer}
        onPointerCancel={clearHoldTimer}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        className="block select-none overflow-hidden rounded-card border border-border bg-surface transition-shadow hover:shadow-soft"
      >
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-canvas">
          {coffee.coverPhotoUrl ? (
            <Image
              src={coffee.coverPhotoUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover"
              unoptimized
            />
          ) : (
            <CoffeeIcon aria-hidden className="size-10 text-coffee" />
          )}
        </div>
        <div className="p-4">
          <p className="text-xs font-medium text-ink-muted">{coffee.roaster}</p>
          <p className="font-display text-lg text-ink">{coffee.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {coffee.country && (
              <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink-muted">
                {coffee.country}
              </span>
            )}
            {coffee.process && (
              <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink-muted">
                {coffee.process}
              </span>
            )}
            {coffee.roast_level && (
              <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink-muted">
                {dict.enums.roastLevel[coffee.roast_level as (typeof ROAST_LEVELS)[number]] ??
                  coffee.roast_level}
              </span>
            )}
            {activeBag && <BagStatusBadge status={activeBag.status} dict={dict} />}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {coffee.bags.length} {coffee.bags.length === 1 ? dict.coffees.bag : dict.coffees.bags}
          </p>
        </div>
      </Link>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={closeMenu}
        >
          <div
            role="menu"
            aria-label={dict.coffees.coffeeMenuLabel}
            className="w-full max-w-sm rounded-card border border-border bg-surface p-2 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {error && (
              <p role="alert" className="px-3 pb-1 pt-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {!deleteOpen ? (
              <>
                <Link
                  href="/brew/new"
                  onClick={closeMenu}
                  className="flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium text-ink"
                >
                  <IconPreparar aria-hidden className="size-5" />
                  {dict.dashboard.prepare}
                </Link>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setArchiveConfirmOpen(true)}
                  className="flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium text-ink disabled:opacity-60"
                >
                  <IconArchivar aria-hidden className="size-5" />
                  {dict.coffees.archive}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    setDeleteConfirmName("");
                    setDeleteOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium text-red-700 disabled:opacity-60"
                >
                  <IconEliminar aria-hidden className="size-5" />
                  {dict.common.delete}
                </button>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="mt-1 w-full rounded-input border border-border px-3 py-3 text-center text-sm font-medium text-ink"
                >
                  {dict.common.cancel}
                </button>
              </>
            ) : (
              <div className="p-2">
                <p className="text-xs text-ink">{dict.coffees.deleteConfirmPrompt}</p>
                <div className="mt-2">
                  <Field label={coffee.name} htmlFor="coffee-card-delete-confirm-name">
                    <input
                      id="coffee-card-delete-confirm-name"
                      className={inputClassName}
                      placeholder={dict.coffees.deleteConfirmPlaceholder}
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={isPending || deleteConfirmName.trim() !== coffee.name}
                    onClick={handleDelete}
                    className="min-h-11 flex-1 rounded-input bg-[#F47174] px-4 text-sm font-medium text-[#1b2a6e] disabled:opacity-50"
                  >
                    {isPending ? dict.coffees.deleting : dict.coffees.deleteConfirmButton}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    className="min-h-11 flex-1 rounded-input border border-border px-4 text-sm font-medium text-ink"
                  >
                    {dict.common.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={archiveConfirmOpen}
        message={`${dict.coffees.archiveConfirm} "${coffee.name}"${dict.coffees.archiveConfirmSuffix}`}
        onConfirm={handleArchive}
        onCancel={() => setArchiveConfirmOpen(false)}
      />
    </>
  );
}
