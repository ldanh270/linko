import { randomUUID } from "node:crypto"
import { RSVP_STATUS, UTILITY_STATUS } from "@linko/contracts"
import { BusinessException } from "../../shared/errors/BusinessException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { UtilityRuntime } from "../utility/utility.types"
import type { AppointmentRepository } from "../appointment/appointment.types"
import { SCHEDULING_LIMITS } from "../appointment/appointment.constants"
import type { ReminderDocument, ReminderRepository } from "./reminder.types"
import { REMINDER_STATUS } from "./reminder.constants"

/** Deliver persistent due work with leases, revision checks and restart recovery.
 * @layer Service
 */
export class ReminderWorker {
    private timer: ReturnType<typeof setInterval> | null = null
    private running: Promise<void> | null = null

    /** Inject deterministic time, durable storage and best-effort notification transport. */
    constructor(private readonly dependencies: { reminders: ReminderRepository; appointments: AppointmentRepository; runtime: UtilityRuntime }) {}

    /** Start bounded polling only from the backend lifecycle. */
    start(): void {
        if (this.timer) return
        this.timer = setInterval(() => { void this.tick().catch(this.dependencies.runtime.onError) }, SCHEDULING_LIMITS.WORKER_MS)
        this.timer.unref()
        void this.tick().catch(this.dependencies.runtime.onError)
    }

    /** Stop polling and await the current bounded batch before persistence shutdown. */
    async stop(): Promise<void> {
        if (this.timer) clearInterval(this.timer)
        this.timer = null
        await this.running
    }

    /** Process one non-overlapping bounded batch; safe across independent worker instances. */
    tick(): Promise<void> {
        if (this.running) return this.running
        this.running = this.runBatch().finally(() => { this.running = null })
        return this.running
    }

    private async runBatch(): Promise<void> {
        const { reminders, runtime } = this.dependencies
        for (let index = 0; index < SCHEDULING_LIMITS.BATCH; index += 1) {
            const job = await reminders.claim(runtime.clock.now(), randomUUID())
            if (!job) return
            try {
                const delivered = await runtime.transactionRunner.run((transaction) => this.deliver(job, transaction))
                if (delivered && runtime.clock.now().getTime() - job.dueAt.getTime() <= SCHEDULING_LIMITS.MAX_ALERT_AGE_MS) {
                    await runtime.notifier.reminder(job.ownerId.toString(), job._id.toString()).catch(runtime.onError)
                }
            } catch (error) {
                runtime.onError(error)
                await reminders.retry(job, runtime.clock.now())
            }
        }
    }

    private async deliver(claim: ReminderDocument, transaction: TransactionContext): Promise<boolean> {
        const { reminders, runtime } = this.dependencies
        const job = await reminders.find(claim._id, transaction)
        if (!job || job.status !== REMINDER_STATUS.CLAIMED || job.leaseToken !== claim.leaseToken) return false
        let eligible: boolean
        try {
            await runtime.access.require({ actorId: job.ownerId, conversationId: job.conversationId, messageId: job.messageId, write: true }, transaction)
            eligible = await this.isCurrentAppointment(job, transaction)
        } catch (error) {
            if (!(error instanceof BusinessException)) throw error
            eligible = false
        }
        if (!eligible) { await reminders.cancelClaim(job, transaction); return false }
        return reminders.complete(job, runtime.clock.now(), transaction)
    }

    private async isCurrentAppointment(job: ReminderDocument, transaction: TransactionContext): Promise<boolean> {
        if (!job.appointmentId) return true
        const appointment = await this.dependencies.appointments.find(job.appointmentId, transaction)
        if (!appointment || appointment.status !== UTILITY_STATUS.ACTIVE || appointment.revision !== job.appointmentRevision) return false
        const responses = await this.dependencies.appointments.responses(job.appointmentId, transaction)
        const response = responses.find((candidate) => candidate.userId.equals(job.ownerId))
        if (!response || response.status === RSVP_STATUS.DECLINED || response.reminderMinutes == null) return false
        const membership = await this.dependencies.runtime.access.require({ actorId: job.ownerId, conversationId: job.conversationId, messageId: job.messageId }, transaction)
        return membership.joinedAt.getTime() <= response.joinedAt.getTime()
    }
}
