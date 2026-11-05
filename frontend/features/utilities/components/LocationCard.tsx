"use client"
import { Button } from "@/shared/components/Button"
import { useLocationCard } from "../hooks/useLocationCard"
import { UtilityFeedback } from "./UtilityFeedback"
import { LocationMap } from "./LocationMap"
import { formatUtilityTime } from "../utility-time"

/** Share identity; coordinates always arrive through a fresh authorized query. */
export interface LocationCardProps { readonly conversationId: string; readonly resourceId: string }
/** Render an honest live/stale/ended card with optional attributed map. UI only. */
export function LocationCard({ conversationId, resourceId }: LocationCardProps) {
  const state = useLocationCard(conversationId, resourceId)
  const share = state.query.data
  if (!share) return <UtilityFeedback pending={state.query.isPending} error={state.query.isError} onRetry={() => void state.query.refetch()} />
  return <section className="grid gap-3 text-text-primary" aria-label="Vị trí trực tiếp">
    <div><p className="text-xs uppercase font-semibold text-brand">Vị trí trực tiếp</p><h3 className="font-semibold text-base">{state.ended ? "Đã kết thúc chia sẻ" : state.stale ? "Tạm ngừng cập nhật" : "Đang cập nhật vị trí"}</h3></div>
    {!state.ended && <><p className="text-xs text-text-secondary">Còn {state.remainingMinutes} phút · kết thúc {formatUtilityTime(share.expiresAt)}</p>{state.showMap ? <LocationMap shares={state.shares} /> : <Button variant="secondary" size="small" onClick={state.openMap}>Hiện bản đồ OpenStreetMap</Button>}
      <p className="text-xs text-text-secondary">{share.position ? `Cập nhật ${formatUtilityTime(share.position.updatedAt)} · sai số khoảng ${Math.round(share.position.accuracy)} m` : "Chưa có tọa độ mới."}</p>
      <p className="text-xs text-text-secondary">Chỉ cập nhật khi người gửi mở Linko. Bản đồ dùng dịch vụ OpenStreetMap khi bạn chọn hiển thị.</p>
      {share.canStop && <Button variant="danger" size="small" onClick={state.stop} isLoading={state.isPending}>Dừng chia sẻ</Button>}</>}
    {state.ended && <p className="text-xs text-text-secondary">Tọa độ không còn được cung cấp. Bạn có thể tạo phiên chia sẻ mới.</p>}
  </section>
}
