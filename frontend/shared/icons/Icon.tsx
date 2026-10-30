import type { IconName } from "./icon.constants"
import { ICON_PATHS } from "./icon.paths"

/** Properties for a decorative reference icon; the owning control supplies its label. */
export interface IconProps { readonly name: IconName; readonly className?: string }

/** Render an original reference glyph instead of a platform-dependent text symbol. UI only. */
export function Icon({ name, className = "" }: IconProps) {
  if (ICON_PATHS[name]) return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`inline-icon ${className}`}><path d={ICON_PATHS[name]} /></svg>
  return <i aria-hidden="true" className={`app-icon ri-${name} ${className}`} />
}
