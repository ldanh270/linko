import type { IconName } from "@/shared/icons/icon.constants"

/** Narrow action contract used by contextual menus. */
export interface DropdownAction { readonly label: string; readonly icon?: IconName; readonly disabled?: boolean; readonly onSelect: () => void }
