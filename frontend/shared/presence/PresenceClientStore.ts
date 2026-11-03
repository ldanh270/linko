import { PRESENCE_LIMITS, SOCKET_EVENTS, SOCKET_LIFECYCLE, type PresenceEventDto } from "@linko/contracts"
import type { ChatSocket } from "@/features/chat/api/chatSocket"

/** Own presence subscriptions and account-scoped snapshots independently of React.
 * @pattern Observer
 */
export class PresenceClientStore {
  private socket: ChatSocket | null = null
  private snapshot: Readonly<Record<string, boolean>> = {}
  private readonly listeners = new Set<() => void>()
  private readonly references = new Map<string, number>()
  private generation = 0

  /** Inject the session's socket factory without opening a connection at import time. */
  constructor(private readonly getSocket: () => ChatSocket) {}

  /** Return a referentially stable snapshot until a presence event changes it. */
  readonly getSnapshot = (): Readonly<Record<string, boolean>> => this.snapshot

  /** Notify React consumers only after snapshot replacement. */
  readonly subscribe = (notify: () => void): (() => void) => {
    this.listeners.add(notify)
    return () => { this.listeners.delete(notify) }
  }

  /** Reference-count only visible identifiers, releasing unused entries on unmount. */
  track(ids: readonly string[]): () => void {
    ids.forEach((id) => this.references.set(id, (this.references.get(id) ?? 0) + 1))
    this.bindSocket()
    this.query(ids)
    return () => {
      ids.forEach((id) => {
        const count = (this.references.get(id) ?? 0) - 1
        if (count > 0) this.references.set(id, count)
        else this.references.delete(id)
      })
      this.replace(Object.fromEntries(Object.entries(this.snapshot).filter(([id]) => this.references.has(id))))
    }
  }

  /** Release old socket listeners and invalidate delayed acknowledgements during logout. */
  readonly reset = (): void => {
    this.generation += 1
    this.socket?.off(SOCKET_EVENTS.CONNECT, this.onConnect)
    this.socket?.off(SOCKET_EVENTS.PRESENCE_ONLINE, this.onOnline)
    this.socket?.off(SOCKET_EVENTS.PRESENCE_OFFLINE, this.onOffline)
    this.socket?.off(SOCKET_LIFECYCLE.DISCONNECT, this.onDisconnect)
    this.socket = null
    this.references.clear()
    this.replace({})
  }

  private readonly onConnect = (): void => this.query([...this.references.keys()])
  private readonly onDisconnect = (): void => { this.generation += 1; this.replace({}) }
  private readonly onOnline = (event: PresenceEventDto): void => this.update(event, true)
  private readonly onOffline = (event: PresenceEventDto): void => this.update(event, false)

  private update(event: PresenceEventDto, online: boolean): void {
    if (event?.userId && this.references.has(event.userId)) this.replace({ ...this.snapshot, [event.userId]: online })
  }

  private bindSocket(): void {
    if (this.socket) return
    this.socket = this.getSocket()
    this.socket.on(SOCKET_EVENTS.CONNECT, this.onConnect)
    this.socket.on(SOCKET_EVENTS.PRESENCE_ONLINE, this.onOnline)
    this.socket.on(SOCKET_EVENTS.PRESENCE_OFFLINE, this.onOffline)
    this.socket.on(SOCKET_LIFECYCLE.DISCONNECT, this.onDisconnect)
  }

  private query(ids: readonly string[]): void {
    if (!this.socket?.connected) return
    const generation = this.generation
    for (let start = 0; start < ids.length; start += PRESENCE_LIMITS.MAX_IDS) {
      this.socket.emit(SOCKET_EVENTS.PRESENCE_QUERY, ids.slice(start, start + PRESENCE_LIMITS.MAX_IDS), (batch: Record<string, boolean>) => {
        if (generation !== this.generation || !batch || typeof batch !== "object") return
        const tracked = Object.entries(batch).filter(([id, online]) => this.references.has(id) && typeof online === "boolean")
        this.replace({ ...this.snapshot, ...Object.fromEntries(tracked) })
      })
    }
  }

  private replace(snapshot: Readonly<Record<string, boolean>>): void {
    this.snapshot = snapshot
    this.listeners.forEach((notify) => notify())
  }
}
