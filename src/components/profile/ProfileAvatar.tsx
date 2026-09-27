import { cn } from "@/lib/cn";

// Initials on a filled circle for now — no photo upload yet (the photo
// bucket is private per account, and opening it is its own piece of work).
// Roasters get a rounded square instead of a circle once F6b lands.
export function initialsFor(displayName: string | null, username: string): string {
  const words = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 0 ? words.slice(0, 2).map((word) => word[0]) : [username[0]];
  return letters.join("").toUpperCase();
}

export function ProfileAvatar({
  displayName,
  username,
  className,
}: {
  displayName: string | null;
  username: string;
  className?: string;
}) {
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
