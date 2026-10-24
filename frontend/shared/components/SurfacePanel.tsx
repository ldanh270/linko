import type { ComponentProps } from "react"

/** Shared surface props inherit native section semantics and accessibility. */
export type SurfacePanelProps = ComponentProps<"section">

/** Render a softly elevated content panel with the app's shared surface tokens. UI only. */
export function SurfacePanel({ children, className = "", ...props }: SurfacePanelProps) {
  return <section {...props} className={`surface-panel ${className}`}>{children}</section>
}
