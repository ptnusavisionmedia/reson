'use client';

import type { TextareaHTMLAttributes } from 'react';

export function TextArea({ label, error, hint, ...props }: { label: string; error?: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = props.id ?? label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className="min-h-20 rounded-md border border-line-strong bg-surface p-3 text-fg"
        {...props}
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-err`} className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className="min-h-11 rounded-md border border-line-strong bg-surface px-3 text-fg"
        {...props}
      />
      {error && (
        <p id={`${id}-err`} className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

export function Choice({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-md bg-surface px-4 ${selected ? 'border-2 border-accent' : 'border border-line-strong'}`}
    >
      {selected ? `✓ ${label}` : label}
    </button>
  );
}

export function SmallButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="min-h-11 rounded-md border border-line-strong px-4 text-sm disabled:opacity-50" {...props}>
      {children}
    </button>
  );
}
