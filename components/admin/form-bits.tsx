import type { ReactNode } from 'react';

export const fieldClass =
  'h-11 w-full rounded-sharp border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted';
export const areaClass =
  'w-full rounded-sharp border border-line-strong bg-surface p-3 text-base text-fg placeholder:text-muted';

/** Label, control, hint and error in one place, so every admin form reads the same. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-mono mb-2 block text-muted">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-[0.9rem] text-muted">{hint}</p> : null}
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-[0.9rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Check({
  checked,
  onChange,
  children,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--signal)]"
      />
      <span>
        {children}
        {hint ? <span className="block text-[0.9rem] text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
