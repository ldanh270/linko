"use client"

import { Button } from "@/shared/components/Button"
import { usePushNotifications } from "../hooks/usePushNotifications"

/** Render browser permission controls. UI only, logic lives in usePushNotifications. */
export function BrowserNotificationPermission() {
  const state = usePushNotifications()
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-border bg-surface p-4">
      <p className="max-w-xl text-sm text-text-secondary" role="status">{state.description}</p>
      <Button onClick={state.onEnable} disabled={state.isDisabled} isLoading={state.isRequesting}>{state.label}</Button>
    </section>
  )
}
