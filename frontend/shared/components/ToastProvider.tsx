"use client"

import type { ReactNode } from "react"
import { ToastContext, useToastProvider, useToastViews } from "./useToast"

/** Present notifications from the shared toast context. UI only. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const state = useToastProvider()
  const toasts = useToastViews(state)
  return <ToastContext.Provider value={state}>
    {children}
    <div aria-live="polite" className="fixed bottom-20 right-4 z-50 grid max-w-sm gap-2 md:bottom-4">
      {toasts.map((toast) => <div key={toast.id} role={toast.kind === "error" ? "alert" : "status"} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm shadow-lg">
        <span>{toast.message}</span>
        <button type="button" aria-label="Dismiss notification" onClick={toast.onDismiss} className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]">×</button>
      </div>)}
    </div>
  </ToastContext.Provider>
}
