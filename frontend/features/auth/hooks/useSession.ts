"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { AUTH_CLIENT_EVENTS, AUTH_CLIENT_ROUTES, AUTH_SESSION_STATUS } from "../auth.constants"
import { refreshSession } from "../api/auth.api"
import { resetSharedChatSocket } from "@/features/chat/api/chatSocket"
import { useSignOut } from "./useSignOut"

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
    const signOut = useSignOut(() => setStatus(AUTH_SESSION_STATUS.UNAUTHENTICATED))

    useEffect(() => {
        let isMounted = true
        let isExpired = false
        const handleSessionExpired = () => {
            if (!isMounted) return
            isExpired = true
            resetSharedChatSocket()
            setStatus(AUTH_SESSION_STATUS.UNAUTHENTICATED)
            void queryClient.cancelQueries().finally(() => queryClient.clear())
            router.replace(AUTH_CLIENT_ROUTES.LOGIN)
        }

        window.addEventListener(AUTH_CLIENT_EVENTS.SESSION_EXPIRED, handleSessionExpired)
        void refreshSession().then(() => {
            if (isMounted && !isExpired) setStatus(AUTH_SESSION_STATUS.AUTHENTICATED)
        }).catch(handleSessionExpired)

        return () => {
            isMounted = false
            window.removeEventListener(AUTH_CLIENT_EVENTS.SESSION_EXPIRED, handleSessionExpired)
        }
    }, [queryClient, router])

    return { status, signOut }
}
