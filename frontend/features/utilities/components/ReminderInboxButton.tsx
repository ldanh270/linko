"use client"
import { Button } from "@/shared/components/Button"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useReminderEntry } from "../hooks/useReminderEntry"

/** Render a navigation-sized personal reminder entry without covering the composer. UI only. */
export function ReminderInboxButton() {
  const state = useReminderEntry()
  return <Button variant="ghost" onClick={state.open} aria-label={`Nhắc lịch của tôi${state.unread ? `, ${state.unread} chưa đọc` : ""}`} title="Nhắc lịch của tôi" className="relative w-11 h-13 px-0 text-xl"><Icon name={ICON_NAMES.BELL} />{state.unread > 0 && <span className="absolute top-0 right-0 rounded-full bg-brand px-1 text-[10px] text-brand-contrast">{state.unread}</span>}</Button>
}
