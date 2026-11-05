"use client"
import type { MessageDto } from "@linko/contracts"
import { Button } from "@/shared/components/Button"
import { usePinnedStrip } from "../hooks/usePinnedStrip"

/** Safe pin snapshots and loading feedback supplied by the existing query hook. */
export interface PinnedStripProps { readonly pins: readonly MessageDto[]; readonly error: boolean; readonly onRetry: () => void }
/** Render compact clickable shared pins above the timeline. UI only. */
export function PinnedStrip({ pins, error, onRetry }: PinnedStripProps) {
  const state = usePinnedStrip(pins)
  if (error) return <div role="alert" className="px-4 py-2 text-xs text-danger">Không thể tải tin ghim. <Button variant="ghost" size="small" onClick={onRetry}>Thử lại</Button></div>
  if (!pins.length) return null
  return <div className="border-b border-border bg-brand-soft px-4 py-2 grid gap-1" aria-label="Tin nhắn đã ghim">
    <div className="flex items-center justify-between"><span className="text-xs font-semibold text-brand">Đã ghim · {pins.length}/3</span><Button variant="ghost" size="small" onClick={state.toggle} aria-expanded={state.expanded}>{state.expanded ? "Thu gọn" : "Xem tất cả"}</Button></div>
    {state.visiblePins.map((pin) => <Button key={pin.id} variant="ghost" size="small" className="justify-start min-w-0 text-text-primary" onClick={() => state.open(pin.id)}><span className="truncate">{pin.content || "Nội dung đính kèm"}</span></Button>)}
  </div>
}
