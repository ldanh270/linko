import type { ReactNode } from "react"

export type BadgeVariant = "danger" | "brand" | "neutral" | "success" | "warning"
export type BadgeShape = "pill" | "rounded" | "square"
export type BadgeSize = "sm" | "md"

export interface BadgeProps {
  readonly children: ReactNode
  readonly variant?: BadgeVariant
  readonly shape?: BadgeShape
  readonly size?: BadgeSize
  readonly className?: string
  readonly "aria-label"?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  danger: "bg-badge-background text-badge-text",
  brand: "bg-brand-soft text-brand",
  neutral: "bg-surface-subtle text-text-secondary border border-border",
  success: "bg-positive-soft text-positive",
  warning: "bg-warning-soft text-warning",
}

const SHAPE_CLASSES: Record<BadgeShape, string> = {
  pill: "rounded-full min-w-5 min-h-5 px-1.5",
  rounded: "rounded-md px-2 py-0.5",
  square: "rounded-sm px-1.5 py-0.5",
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "text-2xs font-bold",
  md: "text-xs font-semibold",
}

/** Render accessible, tokens-aligned badges for unread counts, tags, and category labels. UI only. */
export function Badge({
  children,
  variant = "brand",
  shape = "rounded",
  size = "md",
  className = "",
  "aria-label": ariaLabel,
}: BadgeProps) {
  return (
    <span
      className={`inline-grid place-items-center ${VARIANT_CLASSES[variant]} ${SHAPE_CLASSES[shape]} ${SIZE_CLASSES[size]} ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </span>
  )
}
