"use client";

import { useEffect, useState, useTransition } from "react";
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
import { Button } from "@/components/ui/Button";
import { useLongPress } from "@/components/ui/useLongPress";
import { type ROAST_LEVELS } from "@/features/coffees/constants";
import {
  archiveCoffeeAction,
  deleteCoffeeAction,
  getCoffeeDeletionImpactAction,
} from "@/features/coffees/actions";
import { formatDeletionImpact, type DeletionImpact } from "@/features/coffees/deletionImpact";
import type { CoffeeListItem } from "@/features/coffees/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export function CoffeeCard({ coffee, dict }: { coffee: CoffeeListItem; dict: Dictionary }) {
  const router = useRouter();
  const activeBag = coffee.bags.find((b) => b.status === "open") ?? coffee.bags[0] ?? null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openMenu() {
    setError(null);
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
    setDeleteOpen(false);
    setDeleteConfirmName("");
    setImpact(null);
    setError(null);
  }

  const longPress = useLongPress(openMenu);

  // Counted only once the delete pane is actually opened — the card itself
  // doesn't know how many attempts a coffee has, and asking for every card on
  // the page up front would be a query per coffee for a panel almost nobody
  // opens.
  useEffect(() => {
    if (!deleteOpen) return;
    let active = true;
    void getCoffeeDeletionImpactAction(coffee.id).then((result) => {
      if (active && result.success) setImpact(result.data);
    });
    return () => {
      active = false;
    };
  }, [deleteOpen, coffee.id]);

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
        {...longPress}
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
                    setImpact(null);
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
                {impact && (
                  <p className="mt-1 text-xs text-ink-muted">
                    {formatDeletionImpact(dict, impact)} {dict.coffees.deleteArchiveHint}
                  </p>
                )}
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
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={isPending || deleteConfirmName.trim() !== coffee.name}
                    onClick={handleDelete}
                  >
                    {isPending ? dict.coffees.deleting : dict.coffees.deleteConfirmButton}
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={() => setDeleteOpen(false)}>
                    {dict.common.cancel}
                  </Button>
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
