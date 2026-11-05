"use client"
import { LOCATION_DURATIONS } from "@linko/contracts"
import { Modal } from "@/shared/components/Modal/Modal"
import { Button } from "@/shared/components/Button"
import { useLocationForm } from "../hooks/useLocationForm"
import { UTILITY_FIELD_CLASS } from "../utility.constants"

/** Explicit sharing context shown before requesting browser permission. */
export interface LocationFormProps { readonly conversationId: string; readonly conversationName: string; readonly onClose: () => void }
/** Render foreground-location consent and duration choices. UI only. */
export function LocationForm({ conversationId, conversationName, onClose }: LocationFormProps) {
  const state = useLocationForm(conversationId, onClose)
  return <Modal title="Chia sẻ vị trí trực tiếp" onClose={onClose}><form onSubmit={state.submit} className="grid gap-4">
    <p className="text-sm text-text-primary">Chia sẻ với thành viên có quyền xem cuộc trò chuyện <strong>{conversationName}</strong>.</p>
    <label className="grid gap-1.5 text-sm">Thời hạn<select className={UTILITY_FIELD_CLASS} {...state.register("durationMinutes")}>{LOCATION_DURATIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} phút` : `${minutes / 60} giờ`}</option>)}</select></label>
    <p className="text-sm text-text-secondary">Vị trí chỉ cập nhật khi Linko đang hiển thị. Khi khóa màn hình, ẩn tab hoặc mất mạng, người xem thấy thời điểm cập nhật cuối. Bạn có thể dừng sớm bất cứ lúc nào; Linko không lưu đường đi.</p>
    <label className="flex gap-2 items-start text-sm"><input type="checkbox" className="accent-brand mt-1" {...state.register("consent", { required: true })} /><span>Tôi đồng ý chia sẻ vị trí hiện tại trong thời hạn đã chọn.</span></label>
    {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    <Button type="submit" isLoading={state.isPending} disabled={!state.watch("consent")}>Xác nhận và lấy vị trí</Button>
  </form></Modal>
}
