import { Button } from "@/shared/components/Button"
import type { MemberDto } from "@linko/contracts"

/** Available members and selection action supplied by the composer hook. */
export interface MentionListProps { readonly members: readonly MemberDto[]; readonly onSelect: (member: MemberDto) => void }

/** Render keyboard-operable mention choices. UI only. */
export function MentionList({ members, onSelect }: MentionListProps) {
  return <ul className="mention-list" aria-label="Chọn người được nhắc tên">{members.map((member) => <li key={member.userId}><Button variant="ghost" onClick={() => onSelect(member)}>{member.displayName ?? "Thành viên"}</Button></li>)}</ul>
}
