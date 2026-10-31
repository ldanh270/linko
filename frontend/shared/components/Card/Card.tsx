import type { ComponentProps, ReactNode } from "react"

export interface CardProps extends ComponentProps<"article"> {
  readonly children: ReactNode
  readonly className?: string
}

export interface CardHeaderProps {
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly action?: ReactNode
  readonly icon?: ReactNode
  readonly className?: string
}

export interface CardContentProps extends ComponentProps<"div"> {
  readonly children: ReactNode
  readonly className?: string
}

/** Composable surface panel card following the design system tokens. UI only. */
export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <article
      {...props}
      className={`border border-border rounded-panel bg-surface shadow-panel overflow-hidden p-4 sm:p-5 ${className}`}
    >
      {children}
    </article>
  )
}

/** Render structured card header with optional icon, title, description, and action button. UI only. */
export function CardHeader({ title, description, action, icon, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-start sm:items-center justify-between gap-4 border-b border-border pb-3.5 mb-4 ${className}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <span className="text-brand text-lg shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-text-primary truncate">{title}</h2>
          {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** Render content body of a card with default padding. UI only. */
export function CardContent({ children, className = "", ...props }: CardContentProps) {
  return (
    <div {...props} className={className}>
      {children}
    </div>
  )
}
