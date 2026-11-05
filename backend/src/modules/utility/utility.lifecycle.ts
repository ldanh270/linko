import { UTILITY_WORKER_TIMING } from "./utility.constants"

/** Backend-owned worker lifecycle registered during application composition. */
export interface UtilityLifecycle { start(): void; stop(): Promise<void> }
/** Start bounded cleanup alongside durable scheduling without overlapping ticks. */
export class UtilityWorkers implements UtilityLifecycle {
  private timer: ReturnType<typeof setInterval> | null = null
  private pending: Promise<void> | null = null
  /** Bind feature workers and centralized technical failure recording. */
  constructor(private readonly dependencies: { readonly scheduling: UtilityLifecycle; readonly cleanup: () => Promise<void>; readonly onError: (error: unknown) => void }) {}
  /** Start after MongoDB is ready; importing or composing the app starts no timers. */
  start(): void {
    if (this.timer) return
    this.dependencies.scheduling.start()
    const run = () => {
      if (this.pending) return
      this.pending = this.dependencies.cleanup().catch(this.dependencies.onError).finally(() => { this.pending = null })
    }
    run()
    this.timer = setInterval(run, UTILITY_WORKER_TIMING.CLEANUP_MS)
    this.timer.unref()
  }
  /** Drain in-flight work before disconnecting persistence. */
  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await this.dependencies.scheduling.stop()
    await this.pending
  }
}
