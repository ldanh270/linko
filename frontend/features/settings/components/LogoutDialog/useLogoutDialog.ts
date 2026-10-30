"use client"

import { useRef, useState } from "react"
import { useSignOut } from "@/features/auth/hooks/useSignOut"

/** Own confirmation and prevent duplicate sign-out while preserving safe auth cleanup. */
export function useLogoutDialog() {
  const signOut = useSignOut()
  const [isOpen, setOpen] = useState(false), [isPending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const onConfirm = async () => {
    if (inFlight.current) return
    inFlight.current = true; setPending(true); setError(null)
    try { await signOut() }
    catch { setError("Phiên trên thiết bị đã được đóng. Vui lòng đăng nhập lại.") }
    finally { inFlight.current = false; setPending(false) }
  }
  return { isOpen, isPending, error, onOpen: () => setOpen(true), onClose: () => { if (!inFlight.current) setOpen(false) }, onConfirm }
}
