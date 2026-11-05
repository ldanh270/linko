import { Button } from "@/shared/components/Button"
import type { ReminderDto } from "@linko/contracts"

/** Presentation fields and controlled actions for one reminder. */
export interface ReminderInboxItemProps {
  readonly row: { readonly item: ReminderDto; readonly isEditable: boolean; readonly time: string; readonly status: string }
  readonly isPending: boolean
  readonly onOpen: (item: ReminderDto) => void
  readonly onEdit: (item: ReminderDto) => void
  readonly onDismiss: (item: ReminderDto) => void
}
/** Render one private reminder without reading shared or server state. */
export function ReminderInboxItem({ row, isPending, onOpen, onEdit, onDismiss }: ReminderInboxItemProps) {
  return <article className={`grid gap-2 rounded-md border p-3 ${row.item.deliveredAt && !row.item.readAt ? "border-brand bg-brand-soft" : "border-border"}`}>
    <p className="font-semibold text-sm wrap-anywhere">{row.item.title}</p><p className="text-xs text-text-secondary">{row.status} · {row.time}</p>{row.item.note && <p className="text-sm whitespace-pre-wrap wrap-anywhere">{row.item.note}</p>}
    <div className="flex flex-wrap gap-2"><Button size="small" variant="secondary" disabled={isPending} onClick={() => onOpen(row.item)}>Đến tin nhắn</Button>{row.isEditable && <Button size="small" variant="ghost" disabled={isPending} onClick={() => onEdit(row.item)}>Sửa lời nhắc</Button>}<Button size="small" variant="ghost" disabled={isPending} onClick={() => onDismiss(row.item)}>Xóa lời nhắc</Button></div>
  </article>
}
