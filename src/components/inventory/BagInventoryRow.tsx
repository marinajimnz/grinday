"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { BagStatusBadge } from "@/components/coffee/BagStatusBadge";
import {
  IconArchivar,
  IconEliminar,
  IconPreparar,
} from "@/components/icons/pencil-icons";
import { Field, inputClassName } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLongPress } from "@/components/ui/useLongPress";
import {
  archiveCoffeeAction,
  deleteCoffeeAction,
  getCoffeeDeletionImpactAction,
  unarchiveCoffeeAction,
} from "@/features/coffees/actions";
import { formatDeletionImpact, type DeletionImpact } from "@/features/coffees/deletionImpact";
import { formatRemaining } from "@/features/inventory/format";
import type { InventoryBagRow } from "@/features/inventory/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

// Holding a row opens the same menu the library's CoffeeCard does, because
// the archive is only reachable from here: an archived coffee is filtered out
// of /coffees entirely, so Inventario is the one place it can be brought back
// from. The actions are coffee-level even though the row is a bag — archiving
// is a property of the coffee (coffees.archived_at), so acting on one bag's
// row moves all of that coffee's bags together.
export function BagInventoryRow({ bag, dict }: { bag: InventoryBagRow; dict: Dictionary }) {
  const router = useRouter();
  const isArchived = bag.coffee.archived_at !== null || bag.status === "archived";

  const [menuOpen, setMenuOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeMenu() {
    setMenuOpen(false);
    setDeleteOpen(false);
    setDeleteConfirmName("");
    setImpact(null);
    setError(null);
  }

  const longPress = useLongPress(() => {
    setError(null);
    setMenuOpen(true);
  });

  // Only once the delete pane is open — see the same effect in CoffeeCard.
  useEffect(() => {
    if (!deleteOpen) return;
    let active = true;
    void getCoffeeDeletionImpactAction(bag.coffee.id).then((result) => {
      if (active && result.success) setImpact(result.data);
    });
    return () => {
      active = false;
    };
  }, [deleteOpen, bag.coffee.id]);

  function run(action: () => Promise<{ success: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.message ?? "");
        return;
      }
      setArchiveConfirmOpen(false);
      closeMenu();
      router.refresh();
    });
  }

  return (
    <>
      <Link
        href={`/bags/${bag.id}`}
        {...longPress}
        className="flex select-none items-center justify-between gap-4 rounded-card border border-border bg-surface p-4"
      >
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">{bag.coffee.roaster}</p>
          <p className="truncate font-display text-base text-ink">{bag.coffee.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <BagStatusBadge status={bag.status} dict={dict} />
            <span className="text-sm text-ink">{formatRemaining(bag, dict)}</span>
          </div>
        </div>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
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
              <p role="alert" className="px-3 pb-1 pt-2 text-sm text-danger">
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
                  {isArchived ? dict.coffees.unarchive : dict.coffees.archive}
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
                  className="flex w-full items-center gap-3 rounded-input px-3 py-3 text-left text-sm font-medium text-danger disabled:opacity-60"
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
                  <Field label={bag.coffee.name} htmlFor={`bag-row-delete-confirm-${bag.id}`}>
                    <input
                      id={`bag-row-delete-confirm-${bag.id}`}
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
                    disabled={isPending || deleteConfirmName.trim() !== bag.coffee.name}
                    onClick={() => run(() => deleteCoffeeAction(bag.coffee.id))}
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
        message={
          isArchived
            ? `${dict.coffees.unarchiveConfirm} "${bag.coffee.name}"${dict.coffees.unarchiveConfirmSuffix}`
            : `${dict.coffees.archiveConfirm} "${bag.coffee.name}"${dict.coffees.archiveConfirmSuffix}`
        }
        onConfirm={() =>
          run(() =>
            isArchived
              ? unarchiveCoffeeAction(bag.coffee.id)
              : archiveCoffeeAction(bag.coffee.id),
          )
        }
        onCancel={() => setArchiveConfirmOpen(false)}
      />
    </>
  );
}
