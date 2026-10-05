"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { AUTH_CLIENT_EVENTS, AUTH_CLIENT_ROUTES, AUTH_SESSION_STATUS } from "../auth.constants"
import { logout, refreshSession } from "../api/auth.api"

/** Current client-side auth bootstrap state. */
export type SessionStatus = (typeof AUTH_SESSION_STATUS)[keyof typeof AUTH_SESSION_STATUS]

/** Session state exposed to client components that need to sign out explicitly. */
export interface SessionState {
    readonly status: SessionStatus
    readonly signOut: () => Promise<void>
}

/** Restore the cookie-backed session and route away when the session expires. */
export function useSession(): SessionState {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [status, setStatus] = useState<SessionStatus>(AUTH_SESSION_STATUS.LOADING)

    useEffect(() => {
        let isMounted = true
        const handleSessionExpired = () => {
            if (!isMounted) return
            setStatus(AUTH_SESSION_STATUS.UNAUTHENTICATED)
            void queryClient.cancelQueries().finally(() => queryClient.clear())
            router.replace(AUTH_CLIENT_ROUTES.LOGIN)
        }

        window.addEventListener(AUTH_CLIENT_EVENTS.SESSION_EXPIRED, handleSessionExpired)
        void refreshSession().then(() => {
            if (isMounted) setStatus(AUTH_SESSION_STATUS.AUTHENTICATED)
        }).catch(() => {
            if (!isMounted) return
            setStatus(AUTH_SESSION_STATUS.UNAUTHENTICATED)
            void queryClient.cancelQueries().finally(() => queryClient.clear())
            router.replace(AUTH_CLIENT_ROUTES.LOGIN)
        })

        return () => {
            isMounted = false
            window.removeEventListener(AUTH_CLIENT_EVENTS.SESSION_EXPIRED, handleSessionExpired)
        }
    }, [queryClient, router])

    const signOut = useCallback(async () => {
        try {
            await logout()
        } finally {
            setStatus(AUTH_SESSION_STATUS.UNAUTHENTICATED)
            await queryClient.cancelQueries()
            queryClient.clear()
            router.replace(AUTH_CLIENT_ROUTES.LOGIN)
        }
    }, [queryClient, router])

    return { status, signOut }
}
