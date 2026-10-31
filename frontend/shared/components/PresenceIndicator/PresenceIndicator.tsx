export type PresenceVariant = "dot" | "badge" | "text"
export type PresenceSize = "sm" | "md" | "lg"

export interface PresenceIndicatorProps {
  readonly isOnline: boolean
  readonly variant?: PresenceVariant
  readonly size?: PresenceSize
  readonly labelOnline?: string
  readonly labelOffline?: string
  readonly className?: string
  readonly showDotInText?: boolean
}

/** Render a high-contrast presence indicator with dot, badge, or text variant. UI only. */
export function PresenceIndicator({
  isOnline,
  variant = "dot",
  size = "md",
  labelOnline = "Đang hoạt động",
  labelOffline = "Ngoại tuyến",
  className = "",
  showDotInText = true,
}: PresenceIndicatorProps) {
  const label = isOnline ? labelOnline : labelOffline

  const dotSizeClass =
    size === "sm" ? "w-1.5 h-1.5" : size === "lg" ? "w-2.5 h-2.5" : "w-2 h-2"

  const dotColorClass = isOnline
    ? "bg-status-online shadow-[0_0_6px_var(--status-online-glow)]"
    : "bg-status-offline"

  if (variant === "dot") {
    return (
      <span
        className={`inline-block rounded-full ${dotSizeClass} ${dotColorClass} ${className}`}
        title={label}
        aria-label={label}
      />
    )
  }

  if (variant === "badge") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
          isOnline
            ? "border-status-online/40 bg-status-online/10 text-status-online"
            : "border-status-offline/40 bg-status-offline/10 text-status-offline"
        } ${className}`}
      >
        <span className={`rounded-full ${dotSizeClass} ${dotColorClass}`} aria-hidden="true" />
        <span>{label}</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      {showDotInText && (
        <span className={`rounded-full ${dotSizeClass} ${dotColorClass}`} aria-hidden="true" />
      )}
      <span
        className={
          isOnline ? "text-status-online font-semibold" : "text-text-secondary font-medium"
        }
      >
        {label}
      </span>
    </span>
  )
}
