"use client"

import type { ReactNode } from "react"

import { AppShell } from "@/shared/layout/AppShell"
import { AUTH_SESSION_STATUS, AUTH_STATUS_MESSAGES } from "../auth.constants"
import { useSession } from "../hooks/useSession"

/** Props for the route guard around authenticated application pages. */
export interface ProtectedAppShellProps {
    readonly children: ReactNode
}

/** Render the app frame only after a cookie-backed session has been restored. UI only. */
export function ProtectedAppShell({ children }: ProtectedAppShellProps) {
    const { status } = useSession()
    if (status === AUTH_SESSION_STATUS.AUTHENTICATED) return <AppShell>{children}</AppShell>

    const message = status === AUTH_SESSION_STATUS.LOADING
        ? AUTH_STATUS_MESSAGES.LOADING
        : AUTH_STATUS_MESSAGES.UNAUTHENTICATED
    return <main aria-busy={status === AUTH_SESSION_STATUS.LOADING}>
        <p role="status" className="sr-only">{message}</p>
    </main>
}
