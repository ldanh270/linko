"use client"
import { Modal } from "@/shared/components/Modal/Modal"
import { Button } from "@/shared/components/Button"
import { useReminderInbox } from "../hooks/useReminderInbox"
import { UtilityFeedback } from "./UtilityFeedback"
import { MessageReminderForm } from "./MessageReminderForm"
import { ReminderInboxItem } from "./ReminderInboxItem"

/** Private reminder inbox dismissal contract. */
export interface ReminderInboxProps { readonly onClose: () => void }
/** Render pending and delivered reminders with source navigation. UI only. */
export function ReminderInbox({ onClose }: ReminderInboxProps) {
  const state = useReminderInbox(onClose)
  return <Modal title="Nhắc lịch của tôi" onClose={onClose}><div className="grid gap-3">
    <Button variant="ghost" size="small" onClick={state.readAll} disabled={state.isPending}>Đánh dấu tất cả đã đọc</Button>
    <UtilityFeedback pending={state.query.isPending} error={state.query.isError} onRetry={() => void state.query.refetch()} />
    {!state.query.isPending && !state.query.isError && state.rows.length === 0 && <p className="text-sm text-text-secondary py-8 text-center">Chưa có lời nhắc. Chọn “Nhắc tôi” trên một tin nhắn hoặc đăng ký nhắc trong lịch hẹn.</p>}
    {state.rows.map((row) => <ReminderInboxItem key={row.item.id} row={row} isPending={state.isPending} onOpen={state.open} onEdit={state.edit} onDismiss={state.dismiss} />)}
    {state.query.hasNextPage && <Button variant="secondary" onClick={state.loadMore} isLoading={state.query.isFetchingNextPage}>Tải thêm lời nhắc</Button>}
    {state.editing && <MessageReminderForm conversationId={state.editing.conversationId} messageId={state.editing.messageId} reminder={state.editing} onClose={state.closeEdit} />}
  </div></Modal>
}
