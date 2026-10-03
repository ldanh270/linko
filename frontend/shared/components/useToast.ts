"use client"

import { createContext, useContext, useRef, useState } from "react"

/** Toast severity values shared by async feature actions. */
export type ToastKind = "success" | "error" | "info"

/** One notification presented by the shared toast region. */
export interface Toast { id: number; message: string; kind: ToastKind }

/** Actions and notifications exposed by the toast provider. */
export interface ToastState { toasts: Toast[]; show(message: string, kind?: ToastKind): void; dismiss(id: number): void }

/** Presentation data with a bound dismiss action for each toast. */
export interface ToastView extends Toast { onDismiss(): void }

/** Toast context consumed by feature hooks. */
export const ToastContext = createContext<ToastState | null>(null)

/** Own transient notification state and actions. */
export function useToastProvider(): ToastState {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const show = (message: string, kind: ToastKind = "info") => {
    nextId.current += 1
    const id = nextId.current
    setToasts((current) => [...current, { id, message, kind }])
  }
  const dismiss = (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id))
  return { toasts, show, dismiss }
}

/** Bind dismiss actions outside the notification JSX. */
export function useToastViews(state: ToastState): ToastView[] {
  return state.toasts.map((toast) => ({ ...toast, onDismiss: () => state.dismiss(toast.id) }))
}

/** Access the shared notification actions from a feature hook. */
export function useToast(): ToastState {
  const state = useContext(ToastContext)
  if (!state) throw new Error("ToastProvider is required")
  return state
}
