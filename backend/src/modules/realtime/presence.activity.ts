import type { PresenceActivityRecorder, PresenceRepository } from "./presence.types"

/** Isolate best-effort last-active persistence from completed presence transitions.
 *
 * A database outage must not prevent offline delivery after Redis has already cleared a lease.
 *
 * @pattern Decorator
 * @layer Aspect
 */
export class BestEffortPresenceActivityRecorder implements PresenceActivityRecorder {
    /** Inject persistence and structured failure reporting without transport dependencies. */
    constructor(private readonly repository: PresenceRepository, private readonly onError: (error: unknown) => void) {}

    /** Record activity independently; report technical failures without rejecting lifecycle delivery. */
    async recordOffline(userId: string, at: Date): Promise<void> {
        try { await this.repository.updateLastActive(userId, at) }
        catch (error) { this.onError(error) }
    }
}
