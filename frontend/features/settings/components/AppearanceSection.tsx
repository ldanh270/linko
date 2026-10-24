import type { useSettingsPage } from "../hooks/useSettingsPage"

/** Theme options already bound to the shared provider. */
export interface AppearanceSectionProps { readonly options: ReturnType<typeof useSettingsPage>["themeOptions"] }

/** Render persistent system/light/dark theme choices. UI only. */
export function AppearanceSection({ options }: AppearanceSectionProps) {
  return <fieldset className="grid gap-3"><legend className="sr-only">Chế độ giao diện</legend>{options.map((option) => <label key={option.value} className="flex min-h-10 cursor-pointer items-center gap-3 rounded p-2 hover:bg-[var(--brand-soft)]"><input type="radio" name="theme" checked={option.isChecked} onChange={option.onSelect} value={option.value} />{option.label}</label>)}</fieldset>
}
