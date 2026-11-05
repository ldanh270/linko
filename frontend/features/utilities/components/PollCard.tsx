"use client"
import { Button } from "@/shared/components/Button"
import { usePollCard } from "../hooks/usePollCard"
import { UtilityFeedback } from "./UtilityFeedback"
import { formatUtilityTime } from "../utility-time"
import { useUtilityIdentity } from "../utility-identity"

/** Utility card identity resolved from a timeline message. */
export interface PollCardProps { readonly conversationId: string; readonly resourceId: string }
/** Render poll choices, named results and close controls. UI only, logic lives in usePollCard. */
export function PollCard({ conversationId, resourceId }: PollCardProps) {
  const state = usePollCard(conversationId, resourceId)
  const name = useUtilityIdentity()
  const poll = state.query.data
  if (!poll) return <UtilityFeedback pending={state.query.isPending} error={state.query.isError} onRetry={() => void state.query.refetch()} />
  return <section className="w-full min-w-[min(240px,100%)] grid gap-3 text-text-primary" aria-label="Bình chọn">
    <div><p className="text-xs font-semibold uppercase tracking-wide text-brand">Bình chọn · {poll.status === "closed" ? "Đã đóng" : "Đang mở"}</p><h3 className="font-semibold text-base wrap-anywhere">{poll.question}</h3></div>
    <p className="text-xs text-text-secondary">{poll.mode === "multiple" ? "Chọn nhiều phương án · tỷ lệ tính trên số người, có thể vượt 100%" : "Chọn một phương án"}</p>
    <div className="grid gap-2">{poll.options.map((option) => <label key={option.id} className="flex gap-2 rounded-md border border-border p-2.5 cursor-pointer hover:bg-surface-subtle"><input type={poll.mode === "single" ? "radio" : "checkbox"} name={`poll-${poll.id}`} checked={state.selected.includes(option.id)} onChange={() => state.choose(option.id)} disabled={poll.status === "closed" || state.isPending} className="accent-brand mt-1" /><span className="flex-1 min-w-0"><span className="block text-sm wrap-anywhere">{option.text}</span><span className="block text-xs text-text-secondary">{option.count} phiếu{poll.voterCount ? ` · ${Math.round(option.count / poll.voterCount * 100)}%` : ""}</span><details className="text-xs text-text-secondary"><summary className="cursor-pointer">Người bình chọn</summary>{option.voterIds.length ? option.voterIds.map((id) => <p key={id} className="truncate">{name(id)}</p>) : <p>Chưa có phiếu.</p>}</details></span></label>)}</div>
    <p className="text-xs text-text-secondary">{poll.voterCount} người bình chọn{poll.closesAt ? ` · Đóng ${formatUtilityTime(poll.closesAt)}` : ""}</p>
    {poll.status === "active" && <div className="flex flex-wrap gap-2"><Button size="small" onClick={state.vote} disabled={!state.selected.length} isLoading={state.isPending}>Gửi lựa chọn</Button><Button size="small" variant="ghost" onClick={state.withdraw} disabled={!poll.selectedOptionIds.length || state.isPending}>Rút phiếu</Button>{poll.canClose && <Button size="small" variant="secondary" onClick={state.close} disabled={state.isPending}>Đóng</Button>}</div>}
    {state.isError && <p role="alert" className="text-danger text-xs">Chưa lưu được lựa chọn. Hãy thử lại.</p>}
  </section>
}
