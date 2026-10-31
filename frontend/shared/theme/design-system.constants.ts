/**
 * Single Source of Truth (SOT) constants for the Linko Design System.
 * Adheres to Section 6 of AGENTS.md (no magic values, typed constants).
 */

export const DESIGN_SPACING = {
  NONE: "var(--space-0)",
  XXS: "var(--space-0-5)",
  XS: "var(--space-1)",
  SM_TIGHT: "var(--space-1-5)",
  SM: "var(--space-2)",
  MD_TIGHT: "var(--space-2-5)",
  MD: "var(--space-3)",
  LG_TIGHT: "var(--space-3-5)",
  LG: "var(--space-4)",
  XL_TIGHT: "var(--space-5)",
  XL: "var(--space-6)",
  XXL_TIGHT: "var(--space-7)",
  XXL: "var(--space-8)",
  SECTION: "var(--space-10)",
  CONTAINER: "var(--space-12)",
  GUTTER: "var(--space-16)",
} as const

export const DESIGN_RADII = {
  NONE: "var(--radius-none)",
  XS: "var(--radius-xs)",
  SM: "var(--radius-sm)",
  MD: "var(--radius-md)",
  LG: "var(--radius-lg)",
  XL: "var(--radius-xl)",
  XXL: "var(--radius-2xl)",
  FULL: "var(--radius-full)",
} as const

export const DESIGN_SHADOWS = {
  NONE: "var(--shadow-none)",
  XS: "var(--shadow-xs)",
  SM: "var(--shadow-sm)",
  PANEL: "var(--shadow-panel)",
  MD: "var(--shadow-md)",
  LG: "var(--shadow-lg)",
  DROPDOWN: "var(--shadow-dropdown)",
  MODAL: "var(--shadow-modal)",
  BRAND: "var(--shadow-brand)",
} as const

export const DESIGN_LAYOUT = {
  RAIL_WIDTH: "var(--rail-width)",
  SIDEBAR_WIDTH: "var(--sidebar-width)",
  HEADER_HEIGHT: "var(--header-height)",
  INPUT_HEIGHT_SM: "var(--input-height-sm)",
  INPUT_HEIGHT_MD: "var(--input-height-md)",
  INPUT_HEIGHT_LG: "var(--input-height-lg)",
} as const
