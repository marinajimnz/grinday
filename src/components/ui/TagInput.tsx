"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function TagInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setDraft("");
  }

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-input border border-border bg-surface px-2 py-1.5">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-ink"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            aria-label={`Quitar ${tag}`}
            className="text-ink-muted hover:text-ink"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commitDraft();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commitDraft}
        placeholder={value.length ? "" : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm text-ink outline-none placeholder:text-ink-muted"
      />
    </div>
  );
}
