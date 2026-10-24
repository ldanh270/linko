"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { logout } from "../api/auth.api"
import { AUTH_CLIENT_ROUTES } from "../auth.constants"

/** Clear private state and navigate away even when the remote logout request fails. */
export function useSignOut(onSignedOut?: () => void) {
  const router = useRouter(), client = useQueryClient()
  return useCallback(async () => {
    try { await logout() }
    finally { onSignedOut?.(); await client.cancelQueries(); client.clear(); router.replace(AUTH_CLIENT_ROUTES.LOGIN) }
  }, [client, router, onSignedOut])
}
