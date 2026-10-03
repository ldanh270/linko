import type { InputHTMLAttributes } from "react"

/** Input props require a semantic label. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
}

/** Render a labeled field with consistent focus and error states. UI only. */
export function Input({ label, error, id, className = "", ...props }: InputProps) {
  return <div className="grid gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
    <input {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={`min-h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`} />
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
  </div>
}
