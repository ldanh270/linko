"use client"
import { type AppointmentRsvpRequest } from "@linko/contracts"
import { Button } from "@/shared/components/Button"
import { useAppointmentCard } from "../hooks/useAppointmentCard"
import { UtilityFeedback } from "./UtilityFeedback"
import { AppointmentForm } from "./AppointmentForm"
import { formatUtilityTime } from "../utility-time"
import { UTILITY_FIELD_CLASS } from "../utility.constants"
import { useUtilityIdentity } from "../utility-identity"

/** Appointment resource identity. */
export interface AppointmentCardProps { readonly conversationId: string; readonly resourceId: string }
/** Render an appointment, responses and an explicit personal reminder. UI only. */
export function AppointmentCard({ conversationId, resourceId }: AppointmentCardProps) {
  const state = useAppointmentCard(conversationId, resourceId)
  const name = useUtilityIdentity()
  const appointment = state.query.data
  if (!appointment) return <UtilityFeedback pending={state.query.isPending} error={state.query.isError} onRetry={() => void state.query.refetch()} />
  return <section className="grid gap-3 text-text-primary" aria-label="Lịch hẹn">
    <div><p className="text-xs uppercase font-semibold text-brand">Lịch hẹn · {appointment.status === "cancelled" ? "Đã hủy" : "Đã lên lịch"}</p><h3 className="font-semibold text-base wrap-anywhere">{appointment.title}</h3></div>
    <p className="text-sm">{formatUtilityTime(appointment.startsAt, appointment.timezone)}{appointment.endsAt ? ` – ${formatUtilityTime(appointment.endsAt, appointment.timezone)}` : ""}<span className="block text-xs text-text-secondary">{appointment.timezone}</span></p>
    {appointment.place && <p className="text-sm wrap-anywhere">Địa điểm: {appointment.place}</p>}
    {appointment.description && <p className="text-sm whitespace-pre-wrap wrap-anywhere">{appointment.description}</p>}
    {appointment.updatedAt && <p className="text-xs text-text-secondary">Cập nhật {formatUtilityTime(appointment.updatedAt)}</p>}
    <details className="text-xs text-text-secondary"><summary className="cursor-pointer">{appointment.responses.length} phản hồi tham gia</summary>{appointment.responses.map((response) => <p key={response.userId}>{name(response.userId)} · {response.status === "going" ? "Tham gia" : response.status === "maybe" ? "Có thể" : "Không tham gia"}</p>)}</details>
    {appointment.status === "active" && <div className="grid gap-2"><label className="grid gap-1 text-xs">Phản hồi của bạn<select aria-label="Phản hồi của bạn" className={UTILITY_FIELD_CLASS} value={state.status} onChange={(event) => state.setResponse(event.target.value as AppointmentRsvpRequest["status"])}><option value="going">Tham gia</option><option value="maybe">Có thể</option><option value="declined">Không tham gia</option></select></label>
      <label className="grid gap-1 text-xs">Nhắc riêng cho tôi<select aria-label="Nhắc riêng cho tôi" className={UTILITY_FIELD_CLASS} value={state.reminderMinutes} onChange={(event) => state.setReminder(event.target.value)} disabled={state.status === "declined"}><option value="none">Không nhắc</option>{state.reminderOptions.map(({ minutes, disabled }) => <option key={minutes} value={minutes} disabled={disabled}>{minutes ? `Trước ${minutes} phút` : "Khi bắt đầu"}</option>)}</select></label>
      <p className="text-xs text-text-secondary">Đóng trình duyệt: lời nhắc sẽ chờ trong hộp nhắc lịch để bạn xem khi quay lại.</p>
      <div className="flex flex-wrap gap-2"><Button size="small" onClick={state.submit} isLoading={state.isPending}>Lưu phản hồi</Button>{appointment.canManage && <><Button size="small" variant="secondary" onClick={state.edit} disabled={state.isPending}>Sửa</Button><Button size="small" variant="ghost" onClick={state.cancel} disabled={state.isPending}>Hủy lịch</Button></>}</div>
    </div>}
    {state.isError && <p role="alert" className="text-xs text-danger">Chưa lưu được. Kiểm tra thời gian nhắc và thử lại.</p>}
    {state.isEditing && <AppointmentForm conversationId={conversationId} appointment={appointment} onClose={state.closeEdit} />}
  </section>
}
