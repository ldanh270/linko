import type { RequestHandler } from "express"

import { InvitationRateLimitException } from "./InvitationRateLimitException"
import { INVITATION_RATE_LIMITS } from "./invitation.constants"

interface IssueWindow {
    readonly startedAt: number
    readonly count: number
}

/** Limit link creation attempts per authenticated manager in a process-local one-hour window. */
export function createInvitationIssueRateLimit(): RequestHandler {
    const issuesByActor = new Map<string, IssueWindow>()

    return (request, _response, next) => {
        const now = Date.now()
        removeExpiredWindows(issuesByActor, now)

        const actorId = request.user._id.toString()
        const currentWindow = issuesByActor.get(actorId)
        const nextWindow = getNextIssueWindow(currentWindow, now)
        if (nextWindow.count > INVITATION_RATE_LIMITS.MAX_ISSUES) {
            throw new InvitationRateLimitException()
        }

        issuesByActor.set(actorId, nextWindow)
        next()
    }
}

function getNextIssueWindow(currentWindow: IssueWindow | undefined, now: number): IssueWindow {
    if (!currentWindow || now - currentWindow.startedAt >= INVITATION_RATE_LIMITS.WINDOW_MS) {
        return { startedAt: now, count: 1 }
    }
    return { ...currentWindow, count: currentWindow.count + 1 }
}

function removeExpiredWindows(issuesByActor: Map<string, IssueWindow>, now: number): void {
    for (const [actorId, window] of issuesByActor) {
        if (now - window.startedAt >= INVITATION_RATE_LIMITS.WINDOW_MS) issuesByActor.delete(actorId)
    }
}
