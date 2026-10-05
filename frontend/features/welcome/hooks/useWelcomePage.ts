"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { refreshSession } from "@/features/auth/api/auth.api"

/** Resolve whether the visitor already has a session before showing welcome actions. */
export function useWelcomePage() {
  const router = useRouter()
  const [isReady, setReady] = useState(false)
  useEffect(() => {
    let isActive = true
    void refreshSession().then(() => { if (isActive) router.replace("/inbox") }).catch(() => { if (isActive) setReady(true) })
    return () => { isActive = false }
  }, [router])
  return { isReady }
}
