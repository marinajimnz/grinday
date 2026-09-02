"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Coffee as CoffeeIcon, Pencil, Trash2 } from "lucide-react";
import { EditCoffeeForm } from "./EditCoffeeForm";
import { Field, inputClassName } from "@/components/ui/Field";
import { type ROAST_LEVELS } from "@/features/coffees/constants";
import { archiveCoffeeAction, deleteCoffeeAction } from "@/features/coffees/actions";
import type { CoffeeRow } from "@/features/coffees/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function CoffeeDetailPanel({ coffee }: { coffee: CoffeeRow }) {
  const router = useRouter();
  const dict = useDictionary();
  const [editing, setEditing] = useState(false);
  const [isArchiving, startArchive] = useTransition();
  const [isDeletingOpen, setIsDeletingOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  if (editing) {
    return (
      <EditCoffeeForm
        coffee={coffee}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-input bg-canvas">
            <CoffeeIcon aria-hidden className="size-7 text-coffee" />
          </div>
          <div>
            <p className="text-sm text-ink-muted">{coffee.roaster}</p>
            <h1 className="font-display text-2xl text-ink">{coffee.name}</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-3 text-sm font-medium text-ink"
        >
          <Pencil aria-hidden className="size-4" />
          {dict.common.edit}
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        {coffee.country && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.country}</dt>
            <dd className="text-ink">{coffee.country}</dd>
          </div>
        )}
        {coffee.region && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.region}</dt>
            <dd className="text-ink">{coffee.region}</dd>
          </div>
        )}
        {coffee.farm && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.farm}</dt>
            <dd className="text-ink">{coffee.farm}</dd>
          </div>
        )}
        {coffee.producer && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.producer}</dt>
            <dd className="text-ink">{coffee.producer}</dd>
          </div>
        )}
        {coffee.process && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.process}</dt>
            <dd className="text-ink">{coffee.process}</dd>
          </div>
        )}
        {coffee.roast_level && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.roastLevel}</dt>
            <dd className="text-ink">
              {dict.enums.roastLevel[coffee.roast_level as (typeof ROAST_LEVELS)[number]] ??
                coffee.roast_level}
            </dd>
          </div>
        )}
        {(coffee.altitude_min_m || coffee.altitude_max_m) && (
          <div>
            <dt className="text-ink-muted">{dict.coffees.altitude}</dt>
            <dd className="text-ink">
              {coffee.altitude_min_m ?? "?"}–{coffee.altitude_max_m ?? "?"} m
            </dd>
          </div>
        )}
      </dl>

      {coffee.varieties.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-ink-muted">{dict.coffees.varieties}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {coffee.varieties.map((v) => (
              <span key={v} className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {coffee.tasting_notes.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-ink-muted">{dict.coffees.tastingNotes}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {coffee.tasting_notes.map((n) => (
              <span key={n} className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isArchiving}
          onClick={() => {
            if (!confirm(`${dict.coffees.archiveConfirm} "${coffee.name}"${dict.coffees.archiveConfirmSuffix}`))
              return;
            startArchive(async () => {
              await archiveCoffeeAction(coffee.id);
              router.push("/coffees");
            });
          }}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-3 text-sm font-medium text-ink disabled:opacity-60"
        >
          <Archive aria-hidden className="size-4" />
          {isArchiving ? dict.coffees.archiving : dict.coffees.archiveCoffee}
        </button>

        {!isDeletingOpen && (
          <button
            type="button"
            onClick={() => {
              setIsDeletingOpen(true);
              setDeleteError(null);
              setDeleteConfirmName("");
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-input bg-[#F47174] px-3 text-sm font-medium text-[#1b2a6e]"
          >
            <Trash2 aria-hidden className="size-4" />
            {dict.coffees.deleteCoffee}
          </button>
        )}
      </div>

      {isDeletingOpen && (
        <div className="mt-4 rounded-input border border-red-700/40 bg-canvas p-4">
          <p className="text-xs text-ink">{dict.coffees.deleteConfirmPrompt}</p>
          <div className="mt-2">
            <Field label={coffee.name} htmlFor="delete-confirm-name">
              <input
                id="delete-confirm-name"
                className={inputClassName}
                placeholder={dict.coffees.deleteConfirmPlaceholder}
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
              />
            </Field>
          </div>
          {deleteError && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {deleteError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={isDeleting || deleteConfirmName.trim() !== coffee.name}
              onClick={() => {
                setDeleteError(null);
                startDelete(async () => {
                  const result = await deleteCoffeeAction(coffee.id);
                  if (!result.success) {
                    setDeleteError(result.message);
                    return;
                  }
                  router.push("/coffees");
                });
              }}
              className="min-h-11 rounded-input bg-[#F47174] px-4 text-sm font-medium text-[#1b2a6e] disabled:opacity-50"
            >
              {isDeleting ? dict.coffees.deleting : dict.coffees.deleteConfirmButton}
            </button>
            <button
              type="button"
              onClick={() => setIsDeletingOpen(false)}
              className="min-h-11 rounded-input border border-border px-4 text-sm font-medium text-ink"
            >
              {dict.common.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
