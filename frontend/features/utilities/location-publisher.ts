import { UTILITY_LIMITS, type LocationShareDto } from "@linko/contracts"
import { utilityApi } from "./api/utility.api"
import { subscribeSocketReset } from "@/shared/realtime/socketSession"
import { z } from "zod"

/** Route-independent sharing state contains metadata only, never persisted coordinates. */
export interface PublishingShare { readonly id: string; readonly conversationId: string; readonly expiresAt: string; readonly publisherId: string; readonly sequence: number; readonly paused: boolean; readonly isStopping?: boolean; readonly error: string | null }
/** Browser and transport capabilities injected into the publishing lifecycle for deterministic verification. */
export interface PublisherEnvironment {
  readonly watch: (success: PositionCallback, error: PositionErrorCallback) => number
  readonly clear: (id: number) => void
  readonly visible: () => boolean
  readonly online: () => boolean
  readonly now: () => number
  readonly update: typeof utilityApi.fix
  readonly stop: typeof utilityApi.stopLocation
}
/** Own foreground coordinate watches independently of conversation mounting.
 * @layer Service
 */
export class LocationPublisher {
  private entries: readonly PublishingShare[] = []
  private readonly listeners = new Set<() => void>()
  private readonly watches = new Map<string, number>()
  private readonly sentAt = new Map<string, number>()
  private readonly inFlight = new Set<string>()
  private readonly generations = new Map<string, number>()
  private readonly stopping = new Set<string>()
  /** Bind browser and HTTP ports without starting a location request. */
  constructor(private readonly environment: PublisherEnvironment) {}
  /** Subscribe to safe publishing metadata for a global status banner. */
  readonly subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  /** Return a stable snapshot until publishing metadata changes. */
  readonly snapshot = () => this.entries
  /** Begin a watch only after explicit consent and a successful server share creation. */
  start(share: LocationShareDto, publisherId: string): void {
    this.release(share.id)
    this.replace({ id: share.id, conversationId: share.conversationId, expiresAt: share.expiresAt, publisherId, sequence: 0, paused: false, error: null })
    this.sentAt.set(share.id, this.environment.now())
    this.refresh()
  }
  /** Restore metadata after reload without silently requesting location again. */
  restore(entries: readonly PublishingShare[]): void { this.entries = entries.filter((entry) => Date.parse(entry.expiresAt) > this.environment.now()).map((entry) => ({ ...entry, paused: true, error: "Phiên trước đang tạm dừng. Bấm tiếp tục để chia sẻ lại vị trí." })); this.emit() }
  /** Resume only after an explicit click when a permission error or reload suspended a watch. */
  resume(): void { this.entries = this.entries.map((entry) => ({ ...entry, error: null })); this.refresh() }
  /** Remove a session after an authorized read confirms it ended elsewhere. */
  forget(id: string): void { this.release(id); this.remove(id) }
  /** Pause hidden/offline publishers; resume only the explicitly started, unexpired sessions. */
  refresh(): void {
    for (const entry of [...this.entries]) {
      if (Date.parse(entry.expiresAt) <= this.environment.now()) { this.release(entry.id); this.remove(entry.id); continue }
      if (this.stopping.has(entry.id)) continue
      if (entry.error && !this.watches.has(entry.id)) continue
      if (!this.environment.visible() || !this.environment.online()) {
        this.release(entry.id); this.replace({ ...entry, paused: true }); continue
      }
      if (this.watches.has(entry.id)) continue
      const generation = this.generations.get(entry.id) ?? 0
      this.generations.set(entry.id, generation)
      const watch = this.environment.watch((position) => {
        if (this.generations.get(entry.id) === generation) void this.publish(entry.id, position, generation)
      }, (error) => {
        if (this.generations.get(entry.id) !== generation) return
        this.release(entry.id)
        const latest = this.entries.find((item) => item.id === entry.id)
        if (latest) this.replace({ ...latest, paused: true, error: error.code === 1 ? "Quyền vị trí đã bị từ chối. Cho phép vị trí rồi bấm tiếp tục." : "Chưa lấy được vị trí. Bấm tiếp tục để thử lại." })
      })
      this.watches.set(entry.id, watch)
      this.replace({ ...entry, paused: false, error: null })
    }
  }
  /** Stop one server session and its local watch; failures remain visible and retryable. */
  async stop(id: string): Promise<void> {
    const entry = this.entries.find((item) => item.id === id)
    if (!entry || this.stopping.has(id)) return
    this.stopping.add(id)
    this.release(id)
    this.replace({ ...entry, paused: true, isStopping: true })
    try { await this.environment.stop(entry.conversationId, id); this.remove(id) }
    catch { if (this.entries.some((item) => item.id === id)) this.replace({ ...entry, paused: true, isStopping: false, error: "Chưa dừng được trên máy chủ. Hãy thử lại; phiên vẫn tự hết hạn." }) }
    finally { this.stopping.delete(id) }
  }
  /** Tear down every watcher immediately on logout; server expiry remains authoritative offline. */
  reset(): void {
    for (const entry of this.entries) { this.release(entry.id); void this.environment.stop(entry.conversationId, entry.id).catch(() => undefined) }
    this.entries = []; this.emit()
  }
  private async publish(id: string, position: GeolocationPosition, generation: number): Promise<void> {
    const entry = this.entries.find((item) => item.id === id)
    if (!entry || this.stopping.has(id) || !this.environment.visible() || !this.environment.online() || Date.parse(entry.expiresAt) <= this.environment.now()) return
    if (this.inFlight.has(id) || this.environment.now() - (this.sentAt.get(id) ?? -Infinity) < UTILITY_LIMITS.LOCATION_INTERVAL_MS) return
    this.sentAt.set(id, this.environment.now()); this.inFlight.add(id)
    const sequence = entry.sequence + 1
    this.replace({ ...entry, sequence })
    try {
      await this.environment.update(entry.conversationId, id, { publisherId: entry.publisherId, sequence, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy })
      const current = this.entries.find((item) => item.id === id)
      if (current && !this.stopping.has(id) && this.generations.get(id) === generation) this.replace({ ...current, paused: false, error: null })
    } catch {
      const current = this.entries.find((item) => item.id === id)
      if (current && !this.stopping.has(id) && this.generations.get(id) === generation) this.replace({ ...current, paused: true, error: "Vị trí chưa được cập nhật. Đang chờ lần lấy vị trí tiếp theo." })
    } finally { this.inFlight.delete(id) }
  }
  private release(id: string): void { this.generations.set(id, (this.generations.get(id) ?? 0) + 1); const watch = this.watches.get(id); if (watch !== undefined) this.environment.clear(watch); this.watches.delete(id) }
  private remove(id: string): void { this.entries = this.entries.filter((item) => item.id !== id); this.sentAt.delete(id); this.emit() }
  private replace(entry: PublishingShare): void { this.entries = [...this.entries.filter((item) => item.id !== entry.id), entry]; this.emit() }
  private emit(): void { this.listeners.forEach((listener) => listener()) }
}

let instance: LocationPublisher | null = null
const publisherStorageKey = "linko_foreground_shares"
const savedShareSchema = z.array(z.object({ id: z.string().regex(/^[a-f\d]{24}$/i), conversationId: z.string().regex(/^[a-f\d]{24}$/i), expiresAt: z.string().datetime(), publisherId: z.string(), sequence: z.number().int().nonnegative(), paused: z.boolean(), error: z.string().nullable() }))
/** Obtain the app-scoped publisher without requesting a position until start is called. */
export function getLocationPublisher(): LocationPublisher {
  if (!instance) {
    instance = new LocationPublisher({ watch: (success, error) => navigator.geolocation.watchPosition(success, error, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }), clear: (id) => navigator.geolocation.clearWatch(id), visible: () => !document.hidden, online: () => navigator.onLine, now: Date.now, update: utilityApi.fix, stop: utilityApi.stopLocation })
    if (typeof window !== "undefined") {
      try { const saved = savedShareSchema.safeParse(JSON.parse(sessionStorage.getItem(publisherStorageKey) ?? "[]")); if (saved.success) instance.restore(saved.data) } catch { /** Unavailable storage must not prevent explicit sharing. */ }
      instance.subscribe(() => { try { sessionStorage.setItem(publisherStorageKey, JSON.stringify(instance?.snapshot() ?? [])) } catch { /** Location sharing remains available without session persistence. */ } })
    }
    subscribeSocketReset(() => instance?.reset())
  }
  return instance
}
