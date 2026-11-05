"use client"
import { DropdownMenu } from "@/shared/components/DropdownMenu/DropdownMenu"
import { useUtilityPanel } from "../hooks/useUtilityPanel"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

/** Composer capability state. */
export interface ComposerUtilityMenuProps { readonly disabled: boolean }
/** Render utility creation actions beside the existing attachment picker. UI only. */
export function ComposerUtilityMenu({ disabled }: ComposerUtilityMenuProps) {
  const state = useUtilityPanel()
  return <DropdownMenu label="Thêm hoạt động" placement="top" items={[
    { label: "Tạo lịch hẹn", icon: ICON_NAMES.CLOCK, disabled, onSelect: () => state.open("appointment") },
    { label: "Tạo bình chọn", icon: ICON_NAMES.GROUP, disabled, onSelect: () => state.open("poll") },
    { label: "Chia sẻ vị trí trực tiếp", icon: ICON_NAMES.GLOBE, disabled, onSelect: () => state.open("location") },
    { label: "Xem hoạt động", icon: ICON_NAMES.FILE, onSelect: () => state.open("overview") },
  ]} />
}
