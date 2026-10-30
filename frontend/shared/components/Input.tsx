import type { InputHTMLAttributes, ReactNode } from "react"

/** Input props require a semantic label. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string
  endAdornment?: ReactNode
}

/** Render a labeled field with consistent focus and error states. UI only. */
export function Input({ label, error, id, className = "", endAdornment, ...props }: InputProps) {
  return <div className="grid gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
    <div className="relative flex items-center">
      <input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50 ${endAdornment ? "pr-11 " : ""}${className}`}
      />
      {endAdornment && (
        <div className="absolute right-2 flex items-center justify-center">
          {endAdornment}
        </div>
      )}
    </div>
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
  </div>
}
