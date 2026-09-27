import { Store } from "lucide-react";
import { cn } from "@/lib/cn";

// Initials on a filled circle for a person; a shop mark on a rounded
// square for a roaster, so the two tell apart at a glance in any list.
// No photo upload yet (the photo bucket is private per account, and opening
// it is its own piece of work).
export function initialsFor(displayName: string | null, username: string): string {
  const words = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 0 ? words.slice(0, 2).map((word) => word[0]) : [username[0]];
  return letters.join("").toUpperCase();
}

export function ProfileAvatar({
  displayName,
  username,
  kind = "person",
  className,
}: {
  displayName: string | null;
  username: string;
  kind?: "person" | "roaster";
  className?: string;
}) {
  if (kind === "roaster") {
    return (
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center rounded-input border border-border bg-canvas text-coffee",
          className,
        )}
      >
        <Store className="size-[45%]" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-coffee font-display text-surface",
        className,
      )}
    >
      {initialsFor(displayName, username)}
    </span>
  );
}
