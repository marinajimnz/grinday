// text-base (16px) below the sm breakpoint: iOS Safari zooms the whole
// page in on focus when an input's font-size is under 16px, which felt
// like the page "growing" when tapping into a field on mobile.
export const inputClassName =
  "min-h-11 w-full rounded-input border border-border bg-surface px-3 text-base text-ink outline-none focus:border-ink sm:text-sm";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
