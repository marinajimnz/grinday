import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const VARIANT_CLASSES = {
  primary: "bg-ink text-surface",
  secondary: "border border-border text-ink",
  // Both halves were hardcoded hex, so this one fill ignored the theme and
  // ignored --color-danger, the token every other danger-coloured thing in
  // the app reads. On the token it is a deep red on white in light and the
  // same coral it always was on dark ink in dark — 6.42:1 and 5.83:1,
  // against 4.65:1 before — and it finally agrees with text-danger about
  // what danger looks like.
  destructive: "bg-danger text-surface",
} as const;

export type Variant = keyof typeof VARIANT_CLASSES;

// Every plain action button/link in the app (save, cancel, delete,
// archive, "usar como base"...) used this same min-h-11/rounded-input
// recipe by hand — this is the one place it's defined. Doesn't cover
// selectable/toggle buttons (Sí/No, mode pickers), which vary their own
// selected-state classes per option and don't fit a single variant.
// The focus ring is the browser's until a design system claims it: without
// this, every button in the app fell back to the UA default (a 1px orange
// outline in Chrome), which belongs to no palette and sits oddly on the
// ink-filled variants.
const baseClassName =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-input px-4 text-center text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-60";

// Exposed for the rare spot that needs the exact same look on an element
// Button itself can't render — e.g. a raw <button ref> for autofocus,
// which a plain function component can't forward.
export function buttonClassName(
  variant: Variant = "primary",
  opts?: { fullWidth?: boolean; className?: string },
) {
  return cn(baseClassName, VARIANT_CLASSES[variant], opts?.fullWidth && "w-full", opts?.className);
}

type CommonProps = {
  variant?: Variant;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
};

type ButtonAsButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLinkProps = CommonProps &
  Omit<ComponentProps<typeof Link>, "className" | "children"> & {
    href: string;
  };

export function Button({
  variant = "primary",
  fullWidth,
  className,
  children,
  href,
  ...rest
}: ButtonAsButtonProps | ButtonAsLinkProps) {
  const classes = buttonClassName(variant, { fullWidth, className });

  if (href !== undefined) {
    return (
      <Link
        href={href}
        className={classes}
        {...(rest as Omit<ComponentProps<typeof Link>, "href" | "className" | "children">)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
