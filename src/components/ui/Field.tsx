// iOS Safari zooms the whole page in when a control is focused and its
// font-size is under 16px — and it never zooms back out, so the next screen
// you open is still magnified. 16px below the sm breakpoint, where the
// design's 14px would otherwise apply, is the only thing that prevents it:
// the alternatives (maximum-scale, user-scalable=no) buy it by taking
// pinch-zoom away from everyone.
//
// Every control you can focus needs this, including the ones too small or
// too compact to wear the full field recipe below — a filter's select, the
// bare input inside a tag box. Those take this class on its own.
export const noZoomTextClassName = "text-base sm:text-sm";

export const inputClassName =
  `min-h-11 w-full rounded-input border border-border bg-surface px-3 ${noZoomTextClassName} text-ink outline-none focus:border-ink`;

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
