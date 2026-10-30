import { Accordion } from "@/shared/components/Accordion"
import type { useSettingsPage } from "../hooks/useSettingsPage"

/** One supported-behavior explanation and its URL-backed expansion state. */
export interface SettingsDisclosureProps { readonly section: ReturnType<typeof useSettingsPage>["explanations"][number] }

/** Render a reference disclosure without suggesting unavailable editable settings. UI only. */
export function SettingsDisclosure({ section }: SettingsDisclosureProps) {
  return <Accordion id={`settings-${section.id}`} title={section.title} isOpen={section.isOpen} onToggle={section.onToggle}><p className="quiet-copy">{section.description}</p></Accordion>
}
