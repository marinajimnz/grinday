import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center">
      <Icon aria-hidden className="size-8 text-ink-muted" />
      <div>
        <p className="font-display text-lg text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
