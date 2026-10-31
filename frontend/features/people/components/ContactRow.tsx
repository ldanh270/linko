import { Button } from "@/shared/components/Button"
import { DropdownMenu } from "@/shared/components/DropdownMenu/DropdownMenu"
import type { usePeoplePage } from "../hooks/usePeoplePage"

/** Prepared contact label and supported actions. */
export interface ContactRowProps { readonly contact: ReturnType<typeof usePeoplePage>["groups"][number]["contacts"][number] }

/** Render the reference's compact name/action row. UI only. */
export function ContactRow({ contact }: ContactRowProps) {
  return (
    <li className="flex items-center min-h-11 px-4 py-1 gap-2 rounded-md transition-colors hover:bg-input-surface">
      <Button
        variant="ghost"
        className="flex-1 min-w-0 text-left truncate text-base text-text-primary hover:text-brand font-normal justify-start p-0"
        disabled={contact.isOpening}
        onClick={contact.onOpen}
      >
        {contact.name}
      </Button>
      <DropdownMenu label={`Tùy chọn ${contact.name}`} items={contact.menu} />
    </li>
  )
}
