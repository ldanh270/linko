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

const BASE_STYLES = "inline-flex items-center justify-center gap-2 font-medium cursor-pointer transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:transform-none"
const VARIANT_STYLES: Record<ButtonVariant, string> = {
    primary: "bg-brand text-brand-contrast shadow-brand hover:bg-brand-hover",
    secondary: "border border-border bg-surface text-text-primary shadow-sm hover:bg-surface-subtle",
    ghost: "text-brand hover:bg-brand-soft",
    danger: "bg-danger text-danger-contrast hover:brightness-90",
}
const SIZE_STYLES: Record<ButtonSize, string> = {
    small: "min-h-8 px-3 text-sm rounded-sm",
    medium: "min-h-10 px-4 text-base rounded-md",
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
