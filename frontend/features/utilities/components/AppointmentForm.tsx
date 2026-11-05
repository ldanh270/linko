"use client"
import type { AppointmentDto } from "@linko/contracts"
import { Modal } from "@/shared/components/Modal/Modal"
import { Button } from "@/shared/components/Button"
import { Input } from "@/shared/components/Input"
import { useAppointmentForm } from "../hooks/useAppointmentForm"
import { UTILITY_FIELD_CLASS } from "../utility.constants"

/** Appointment creation/editing context. */
export interface AppointmentFormProps { readonly conversationId: string; readonly onClose: () => void; readonly appointment?: AppointmentDto; readonly sourceMessageId?: string }
/** Render timezone-explicit appointment fields. UI only, logic lives in useAppointmentForm. */
export function AppointmentForm({ conversationId, onClose, appointment, sourceMessageId }: AppointmentFormProps) {
  const state = useAppointmentForm(conversationId, onClose, appointment, sourceMessageId)
  return <Modal title={appointment ? "Sửa lịch hẹn" : "Tạo lịch hẹn"} onClose={onClose}><form onSubmit={state.submit} className="grid gap-4">
    <Input id="appointment-title" label="Tiêu đề" error={state.formState.errors.title?.message} {...state.register("title")} />
    <label className="grid gap-1 text-sm">Mô tả<textarea className={`${UTILITY_FIELD_CLASS} py-2 min-h-20`} {...state.register("description")} /></label>
    <Input id="appointment-start" label="Bắt đầu" type="datetime-local" error={state.formState.errors.startsAt?.message} {...state.register("startsAt")} />
    <Input id="appointment-end" label="Kết thúc (tùy chọn)" type="datetime-local" {...state.register("endsAt")} />
    <label className="grid gap-1 text-sm">Múi giờ<select id="appointment-timezone" aria-label="Múi giờ" className={UTILITY_FIELD_CLASS} {...state.register("timezone")}>{state.timezoneOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <label className="grid gap-1 text-sm">Nếu giờ bị lặp khi chuyển giờ mùa hè<select className={UTILITY_FIELD_CLASS} {...state.register("disambiguation")}><option value="reject">Yêu cầu xác nhận</option><option value="earlier">Lần sớm hơn</option><option value="later">Lần muộn hơn</option></select></label>
    <Input id="appointment-place" label="Địa điểm hoặc link họp HTTPS (tùy chọn)" {...state.register("place")} />
    <p className="text-xs text-text-secondary">Bạn sẽ được đánh dấu tham gia. Khi tạo mới, lời nhắc mặc định là trước 15 phút nếu thời điểm đó còn ở tương lai; bạn có thể thay đổi trong thẻ lịch hẹn.</p>
    {state.isError && <p role="alert" className="text-sm text-danger">Chưa lưu được lịch hẹn. Nội dung được giữ; hãy thử lại hoặc tải lại nếu lịch đã được sửa.</p>}
    <Button type="submit" isLoading={state.isPending}>{appointment ? "Lưu thay đổi" : "Tạo lịch hẹn"}</Button>
  </form></Modal>
}
