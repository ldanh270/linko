"use client"
import { Modal } from "@/shared/components/Modal/Modal"
import { useUtilityOverview } from "../hooks/useUtilityOverview"
import { PollCard } from "./PollCard"
import { AppointmentCard } from "./AppointmentCard"
import { LocationCard } from "./LocationCard"
import { UtilityFeedback } from "./UtilityFeedback"
import { LocationMap } from "./LocationMap"
import { Button } from "@/shared/components/Button"

/** Authorized conversation overview context. */
export interface UtilityOverviewProps { readonly conversationId: string; readonly onClose: () => void }
/** Render conversation utility collections with their independent states. UI only. */
export function UtilityOverview({ conversationId, onClose }: UtilityOverviewProps) {
  const state = useUtilityOverview(conversationId)
  return <Modal title="Hoạt động trong cuộc trò chuyện" onClose={onClose}><div className="grid gap-6">
    <section className="grid gap-3"><h3 className="font-semibold">Lịch hẹn</h3><UtilityFeedback pending={state.appointments.isPending} error={state.appointments.isError} onRetry={() => void state.appointments.refetch()} />{state.appointments.data?.length === 0 && <p className="text-sm text-text-secondary">Chưa có lịch hẹn.</p>}{state.appointments.data?.map((item) => <div className="border border-border rounded-md p-3" key={item.id}><AppointmentCard conversationId={conversationId} resourceId={item.id} /></div>)}</section>
    <section className="grid gap-3"><h3 className="font-semibold">Bình chọn</h3><UtilityFeedback pending={state.polls.isPending} error={state.polls.isError} onRetry={() => void state.polls.refetch()} />{state.polls.data?.length === 0 && <p className="text-sm text-text-secondary">Chưa có bình chọn.</p>}{state.polls.data?.map((item) => <div className="border border-border rounded-md p-3" key={item.id}><PollCard conversationId={conversationId} resourceId={item.id} /></div>)}</section>
    <section className="grid gap-3"><h3 className="font-semibold">Vị trí đang chia sẻ</h3><UtilityFeedback pending={state.locations.isPending} error={state.locations.isError} onRetry={() => void state.locations.refetch()} />{state.activeLocations.length === 0 && <p className="text-sm text-text-secondary">Không có phiên chia sẻ đang hoạt động.</p>}{state.activeLocations.map((item) => <div className="border border-border rounded-md p-3" key={item.id}><LocationCard conversationId={conversationId} resourceId={item.id} /></div>)}{state.activeLocations.length > 1 && (state.showMap ? <LocationMap shares={state.activeLocations} /> : <Button variant="secondary" onClick={state.openMap}>Hiện bản đồ các thành viên</Button>)}</section>
  </div></Modal>
}
