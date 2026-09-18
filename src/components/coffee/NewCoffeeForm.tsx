"use client";

import { useEffect, useMemo, useState, useTransition, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ModeSelectCards } from "./wizard/ModeSelectCards";
import {
  CoffeeAltitudeFields,
  CoffeeBasicModeFields,
  CoffeeBasicsFields,
  CoffeeOriginFields,
  CoffeeProfileFields,
} from "./wizard/CoffeeStepFields";
import {
  BagBasicModeFields,
  BagConditionFields,
  BagDatesFields,
  BagInventoryFields,
} from "./wizard/BagStepFields";
import { CoverPhotoPicker } from "./wizard/CoverPhotoPicker";
import type { CoffeeWizardMode } from "./wizard/types";
import { bagFieldsSchema, coffeeFieldsSchema } from "@/lib/validation/coffees";
import {
  createCoffeeAndBagAction,
  findSimilarCoffeeAction,
  registerCoffeeMediaAction,
} from "@/features/coffees/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { useHideBottomNav } from "@/components/ui/BottomNavVisibility";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Button } from "@/components/ui/Button";
import { StepHeader } from "@/components/ui/StepHeader";
import { IconBolsa, IconFlecha, IconGrano } from "@/components/icons/pencil-icons";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

const formSchema = z.object({
  coffee: coffeeFieldsSchema,
  bag: bagFieldsSchema,
});

type FormValues = z.infer<typeof formSchema>;

type WizardStep = {
  key: string;
  section: "coffee" | "bag";
  title: (dict: Dictionary) => string;
  // Step components come from two families with different prop shapes
  // (coffee steps take `control`, bag steps don't); see CoffeeStepFields /
  // BagStepFields for why those are loosely typed too.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Fields: ComponentType<any>;
};

const BASIC_COFFEE_STEPS: WizardStep[] = [
  { key: "basic-coffee", section: "coffee", title: (d) => d.coffees.theCoffee, Fields: CoffeeBasicModeFields },
];
const BASIC_BAG_STEPS: WizardStep[] = [
  { key: "basic-bag", section: "bag", title: (d) => d.coffees.theBag, Fields: BagBasicModeFields },
];
const COMPLETE_COFFEE_STEPS: WizardStep[] = [
  { key: "coffee-basics", section: "coffee", title: (d) => d.coffees.stepCoffeeBasics, Fields: CoffeeBasicsFields },
  { key: "coffee-origin", section: "coffee", title: (d) => d.coffees.stepCoffeeOrigin, Fields: CoffeeOriginFields },
  { key: "coffee-profile", section: "coffee", title: (d) => d.coffees.stepCoffeeProfile, Fields: CoffeeProfileFields },
  { key: "coffee-altitude", section: "coffee", title: (d) => d.coffees.stepCoffeeAltitude, Fields: CoffeeAltitudeFields },
];
const COMPLETE_BAG_STEPS: WizardStep[] = [
  { key: "bag-dates", section: "bag", title: (d) => d.coffees.stepBagDates, Fields: BagDatesFields },
  { key: "bag-condition", section: "bag", title: (d) => d.coffees.stepBagCondition, Fields: BagConditionFields },
  { key: "bag-inventory", section: "bag", title: (d) => d.coffees.stepBagInventory, Fields: BagInventoryFields },
];

// Last step in every mode, handled outside the register()-driven fields
// system below (see the "cover-photo" special case in the render) since it
// holds a plain File, not a form field.
const COVER_PHOTO_STEP: WizardStep = {
  key: "cover-photo",
  section: "bag",
  title: (d) => d.coffees.stepCoverPhoto,
  Fields: CoverPhotoPicker,
};

export function NewCoffeeForm() {
  const router = useRouter();
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [mode, setMode] = useState<CoffeeWizardMode | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [existingCoffeeId, setExistingCoffeeId] = useState<string | undefined>(undefined);
  const [conflict, setConflict] = useState<{ id: string; name: string; roaster: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<"exit" | "changeMode" | null>(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);

  const {
    register,
    control,
    trigger,
    getValues,
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      coffee: { name: "", roaster: "", varieties: [], tastingNotes: [] },
      bag: { inventoryMode: "none", status: "sealed" },
    },
  });

  // Bag status is a computed field, not a choice — a brand-new bag is
  // "open" the moment it has an opened date, "sealed" otherwise.
  const openedAt = watch("bag.openedAt");
  useEffect(() => {
    setValue("bag.status", openedAt ? "open" : "sealed");
  }, [openedAt, setValue]);

  // Once a mode is picked, the wizard is a focused full-screen flow — hide
  // the mobile bottom nav so it doesn't compete for space or attention.
  useHideBottomNav(mode !== null);

  const flatSteps = useMemo(() => {
    if (!mode) return [];
    const coffeeSteps = mode === "basic" ? BASIC_COFFEE_STEPS : COMPLETE_COFFEE_STEPS;
    const bagSteps = mode === "basic" ? BASIC_BAG_STEPS : COMPLETE_BAG_STEPS;
    const tail = [...bagSteps, COVER_PHOTO_STEP];
    return existingCoffeeId ? tail : [...coffeeSteps, ...tail];
  }, [mode, existingCoffeeId]);

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const result = await createCoffeeAndBagAction({
      coffee: values.coffee,
      bag: values.bag,
      existingCoffeeId,
    });
    if (!result.success) {
      setFormError(result.message);
      return;
    }
    if (coverPhotoFile) {
      await uploadCoverPhoto(result.data.bagId, coverPhotoFile);
    }
    router.push(`/coffees/${result.data.coffeeId}`);
  }

  // Best-effort: the coffee and bag are already saved by this point, so a
  // photo upload failure shouldn't block navigation — the same uploader is
  // available from the bag's own page afterwards.
  async function uploadCoverPhoto(bagId: string, file: File) {
    try {
      // Dynamically imported so the (fairly heavy) Supabase browser client
      // and canvas-based compressor only load for the wizard's less common
      // path — most coffees get created without a cover photo.
      const [{ createClient }, { compressImage }] = await Promise.all([
        import("@/lib/supabase/client"),
        import("@/lib/media/compressImage"),
      ]);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const blob = await compressImage(file);
      const path = `${user.id}/${bagId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("coffee-photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      await registerCoffeeMediaAction({ coffeeBagId: bagId, kind: "package_front", storagePath: path });
    } catch (err) {
      console.error("[coffee-photo] failed to upload cover photo:", err);
    }
  }

  async function goToNextStep() {
    if (currentIndex < flatSteps.length - 1) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    await handleSubmit(onSubmit)();
  }

  function handleNext() {
    startTransition(async () => {
      // Name + roaster always live on the very first coffee step in both
      // modes — check for a duplicate right there, before the user fills in
      // the rest, unless we already resolved that via "add to existing".
      if (!existingCoffeeId && currentIndex === 0) {
        const valid = await trigger(["coffee.name", "coffee.roaster"]);
        if (!valid) return;
        const match = await findSimilarCoffeeAction({
          name: getValues("coffee.name"),
          roaster: getValues("coffee.roaster"),
        });
        if (match) {
          setConflict(match);
          return;
        }
      }
      await goToNextStep();
    });
  }

  function handleBack() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      return;
    }
    if (existingCoffeeId) {
      setExistingCoffeeId(undefined);
      setCurrentIndex(0);
      return;
    }
    requestChangeMode();
  }

  // Básico's fields are a strict subset of Completo's (name/roaster/roastLevel
  // for the coffee, purchaseDate/openedAt/status/packageWeightG/inventoryMode
  // for the bag) — switching modes keeps exactly those, so nothing has to be
  // typed twice, and drops anything Completo-only that Básico wouldn't show
  // (and would otherwise still get submitted invisibly).
  function performChangeMode() {
    reset({
      coffee: {
        name: getValues("coffee.name"),
        roaster: getValues("coffee.roaster"),
        roastLevel: getValues("coffee.roastLevel"),
        varieties: [],
        tastingNotes: [],
      },
      bag: {
        purchaseDate: getValues("bag.purchaseDate"),
        openedAt: getValues("bag.openedAt"),
        status: getValues("bag.openedAt") ? "open" : "sealed",
        packageWeightG: getValues("bag.packageWeightG"),
        inventoryMode: getValues("bag.inventoryMode") ?? "none",
      },
    });
    // The dialog already told the user exactly which mode they're switching
    // to (there are only two), so land straight in it instead of bouncing
    // back through the picker they'd have to click through again.
    setMode((current) => (current === "basic" ? "complete" : "basic"));
    setCurrentIndex(0);
    setExistingCoffeeId(undefined);
    setConflict(null);
    setFormError(null);
  }

  function requestChangeMode() {
    if (!isDirty) {
      performChangeMode();
      return;
    }
    setPendingAction("changeMode");
  }

  function requestExit() {
    setPendingAction("exit");
  }

  function handleDialogConfirm() {
    if (pendingAction === "exit") {
      router.push("/coffees");
    } else if (pendingAction === "changeMode") {
      performChangeMode();
    }
    setPendingAction(null);
  }

  function handleDialogCancel() {
    setPendingAction(null);
  }

  function handleUseExistingCoffee() {
    if (!conflict) return;
    setExistingCoffeeId(conflict.id);
    setCurrentIndex(0);
    setConflict(null);
  }

  // Pressing Enter in a plain text field natively submits the form (the
  // browser synthesizes a click on the submit button) — handle that the
  // same way as clicking Next/Save instead of intercepting keydown. Inputs
  // with their own Enter behavior (TagInput) call preventDefault() on it,
  // so this never fires for those.
  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleNext();
  }

  if (!mode) {
    return <ModeSelectCards onSelect={(next) => { setMode(next); setCurrentIndex(0); }} />;
  }

  if (conflict) {
    return (
      <div className="rounded-card border border-border bg-surface p-6">
        <p className="font-display text-lg text-ink">
          {dict.coffees.alreadyHaveCoffee} “{conflict.name}” {dict.coffees.of} {conflict.roaster}
        </p>
        <p className="mt-1 text-sm text-ink-muted">{dict.coffees.sameCoffeeQuestion}</p>
        {formError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {formError}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" disabled={isPending} onClick={handleUseExistingCoffee}>
            {dict.coffees.addThisBagTo} “{conflict.name}”
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={isPending}
            onClick={() => {
              setConflict(null);
              startTransition(goToNextStep);
            }}
          >
            {dict.coffees.createNewAnyway}
          </Button>
        </div>
        <button type="button" onClick={() => setConflict(null)} className="mt-3 text-sm text-ink-muted underline">
          {dict.coffees.backToEdit}
        </button>
      </div>
    );
  }

  const step = flatSteps[currentIndex];
  const StepFields = step.Fields;
  const stepErrors = step.section === "coffee" ? errors.coffee : errors.bag;
  const isLastStep = currentIndex === flatSteps.length - 1;
  // On the very first step, Back would just do what Exit already does
  // (leave this attempt) — showing both is redundant, so Back only shows
  // once there's real step history, or after "add to existing" skipped
  // ahead and Back needs to undo that.
  const showBack = currentIndex > 0 || existingCoffeeId !== undefined;
  const nextLabel = (
    <LoadingLabel loading={isPending} loadingText={isLastStep ? dict.common.saving : dict.common.loading}>
      {isLastStep ? dict.coffees.saveCoffee : dict.common.next}
    </LoadingLabel>
  );

  const otherMode: CoffeeWizardMode = mode === "basic" ? "complete" : "basic";
  const modeTitle: Record<CoffeeWizardMode, string> = {
    basic: dict.coffees.modeBasicTitle,
    complete: dict.coffees.modeCompleteTitle,
  };
  const modeIcon: Record<CoffeeWizardMode, typeof IconGrano> = {
    basic: IconGrano,
    complete: IconBolsa,
  };
  const FromIcon = modeIcon[mode];
  const ToIcon = modeIcon[otherMode];
  const dialogMessage =
    pendingAction === "exit"
      ? dict.coffees.exitConfirm
      : `${dict.coffees.changeModeSentence
          .replace("{from}", modeTitle[mode])
          .replace("{to}", modeTitle[otherMode])} ${dict.coffees.changeModeDataKept}`;

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button type="button" variant="secondary" onClick={requestExit}>
          {dict.coffees.exit}
        </Button>
        <Button type="button" variant="secondary" onClick={requestChangeMode}>
          {dict.coffees.changeMode}
        </Button>
      </div>

      <StepHeader
        step={currentIndex + 1}
        total={flatSteps.length}
        name={step.title(dict)}
        onBack={showBack ? handleBack : undefined}
      />

      {mode === "basic" && (
        <p className="rounded-input bg-canvas px-3 py-2 text-xs text-ink-muted">{dict.coffees.modeBasicNote}</p>
      )}

      {step.key === "cover-photo" ? (
        <CoverPhotoPicker file={coverPhotoFile} onChange={setCoverPhotoFile} />
      ) : (
        <StepFields register={register} control={control} watch={watch} errors={stepErrors} />
      )}

      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {nextLabel}
        </Button>
      </div>
      </form>
      <ConfirmDialog
        open={pendingAction !== null}
        header={
          pendingAction === "changeMode" ? (
            <div className="mb-4 flex items-center justify-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-full bg-ink/5 text-ink">
                <FromIcon className="size-6" />
              </span>
              <IconFlecha aria-hidden className="size-5 text-ink-muted" />
              <span className="flex size-12 items-center justify-center rounded-full bg-ink text-surface">
                <ToIcon className="size-6" />
              </span>
            </div>
          ) : undefined
        }
        message={dialogMessage}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </>
  );
}
