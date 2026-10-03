import type { ButtonHTMLAttributes } from "react"

/** Visual variants supported by shared action buttons. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

/** Hit-area sizes supported by shared action buttons. */
export type ButtonSize = "small" | "medium"

/** Native button props plus shared visual and loading states. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
    isLoading?: boolean
}

const BASE_STYLES = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-semibold cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:transform-none"
const VARIANT_STYLES: Record<ButtonVariant, string> = {
    primary: "bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)]",
    secondary: "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]",
    ghost: "text-[var(--brand)] hover:bg-[var(--brand-soft)]",
    danger: "bg-[var(--danger)] text-[var(--danger-contrast)] hover:brightness-90",
}
const SIZE_STYLES: Record<ButtonSize, string> = {
    small: "text-sm",
    medium: "text-base",
}

/** Render an accessible action with shared hover, focus, disabled and loading states. UI only. */
export function Button({
    children,
    className = "",
    disabled = false,
    isLoading = false,
    size = "medium",
    type = "button",
    variant = "primary",
    ...props
}: ButtonProps) {
    return (
        <button
            {...props}
            type={type}
            disabled={disabled || isLoading}
            aria-busy={isLoading}
            className={`${BASE_STYLES} ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
        >
            {isLoading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />}
            {children}
        </button>
    )
}
