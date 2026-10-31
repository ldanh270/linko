import { Button } from "@/shared/components/Button"
import type { MemberDto } from "@linko/contracts"

/** Available members and selection action supplied by the composer hook. */
export interface MentionListProps { readonly members: readonly MemberDto[]; readonly onSelect: (member: MemberDto) => void }

/** Render keyboard-operable mention choices. UI only. */
export function MentionList({ members, onSelect }: MentionListProps) {
  return (
    <ul
      className="absolute bottom-full left-6 max-h-50 overflow-y-auto bg-surface border border-border rounded-sm shadow-panel z-20 p-1 flex flex-col gap-0.5 list-none"
      aria-label="Chọn người được nhắc tên"
    >
      {members.map((member) => (
        <li key={member.userId}>
          <Button variant="ghost" onClick={() => onSelect(member)}>
            {member.displayName ?? "Thành viên"}
          </Button>
        </li>
      ))}
    </ul>
  )
}
