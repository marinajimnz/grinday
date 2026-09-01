export function StatCard({
  title,
  description,
  children,
  empty,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      <div className="mt-4">
        {empty ? (
          <p className="text-sm text-ink-muted">
            Datos insuficientes todavía — necesitas al menos 3 intentos puntuados en este grupo.
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
