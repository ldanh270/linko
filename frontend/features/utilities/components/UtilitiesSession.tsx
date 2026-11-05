"use client"
import { Button } from "@/shared/components/Button"
import { useUtilitiesSession } from "../hooks/useUtilitiesSession"
import { ReminderInbox } from "./ReminderInbox"

/** Render route-independent sharing controls and the personal reminder entry point. UI only. */
export function UtilitiesSession() {
  const state = useUtilitiesSession()
  return <>
    <div className="fixed bottom-20 right-3 lg:bottom-4 lg:right-4 z-40 flex flex-col items-end gap-2 max-w-[calc(100vw-24px)]">
      {state.shares.map((share) => <div key={share.id} role="status" className="rounded-lg border border-border bg-surface shadow-sm p-3 max-w-sm grid gap-2"><p className="text-xs text-text-primary">{share.paused ? "Vị trí đang tạm ngừng cập nhật" : "Bạn đang chia sẻ vị trí trực tiếp"}</p>{share.error && <p className="text-xs text-danger">{share.error}</p>}<div className="flex gap-2">{share.paused && <Button size="small" variant="secondary" onClick={state.resume} disabled={share.isStopping}>Tiếp tục</Button>}<Button size="small" variant="danger" onClick={() => state.stop(share.id)} isLoading={share.isStopping}>Dừng chia sẻ</Button></div></div>)}
    </div>
    {state.panel.panel === "reminders" && <ReminderInbox onClose={state.panel.close} />}
  </>
}
