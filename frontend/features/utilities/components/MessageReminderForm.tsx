"use client"
import { Modal } from "@/shared/components/Modal/Modal"
import { Button } from "@/shared/components/Button"
import { Input } from "@/shared/components/Input"
import { useMessageReminderForm } from "../hooks/useMessageReminderForm"
import type { ReminderDto } from "@linko/contracts"

/** Private reminder source context. */
export interface MessageReminderFormProps { readonly conversationId: string; readonly messageId: string; readonly onClose: () => void; readonly reminder?: ReminderDto }
/** Render a private reminder form. UI only, logic lives in useMessageReminderForm. */
export function MessageReminderForm({ conversationId, messageId, onClose, reminder }: MessageReminderFormProps) {
  const state = useMessageReminderForm(conversationId, messageId, onClose, reminder)
  return <Modal title={reminder ? "Sửa lời nhắc" : "Nhắc riêng cho tôi"} onClose={onClose}><form className="grid gap-4" onSubmit={state.submit}>
    <Input id="reminder-due" type="datetime-local" label="Nhắc lúc (giờ trên thiết bị)" error={state.formState.errors.dueAt?.message} {...state.register("dueAt", { required: "Chọn thời gian." })} />
    <Input id="reminder-note" label="Ghi chú riêng (tùy chọn)" maxLength={500} {...state.register("note")} />
    <p className="text-xs text-text-secondary">Chỉ bạn thấy lời nhắc này. Khi trình duyệt đóng, lời nhắc chờ trong hộp nhắc lịch để bạn xem khi quay lại.</p>
    {state.isError && <p role="alert" className="text-sm text-danger">Chưa tạo được lời nhắc. Hãy thử lại.</p>}
    <Button type="submit" isLoading={state.isPending}>{reminder ? "Lưu lời nhắc" : "Tạo lời nhắc"}</Button>
  </form></Modal>
}
