// Accessible horizontal bar list: every value is real text in the DOM (the
// row's own label + value), so this doubles as its own textual summary —
// there's no separate image/canvas a screen reader can't reach. Single
// accent hue since each chart plots one magnitude, not several series.
export function StatBarList({
  items,
}: {
  items: { key: string; label: string; value: number; displayValue: string }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink">{item.label}</span>
            <span className="shrink-0 tabular-nums text-ink-muted">{item.displayValue}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-canvas">
            <div
              className="h-2 rounded-full bg-coffee"
              style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
