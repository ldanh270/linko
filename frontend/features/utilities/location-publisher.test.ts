import { describe, expect, it, vi } from "vitest"
import type { LocationShareDto } from "@linko/contracts"
import { LocationPublisher, type PublisherEnvironment } from "./location-publisher"

const share: LocationShareDto = { id: "507f1f77bcf86cd799439011", conversationId: "507f1f77bcf86cd799439012", messageId: "507f1f77bcf86cd799439013", creatorId: "507f1f77bcf86cd799439014", createdAt: "2026-11-05T12:00:00Z", revision: 1, expiresAt: "2026-11-05T13:00:00Z", endedAt: null, status: "active", position: null, canStop: true, isStale: false }
function harness() {
  const callbacks: PositionCallback[] = []
  let success: PositionCallback = () => undefined
  let failure: PositionErrorCallback = () => undefined
  let now = Date.parse("2026-11-05T12:00:00Z")
  let visible = true
  let online = true
  const environment: PublisherEnvironment = { watch: vi.fn((accept, reject) => { callbacks.push(accept); success = accept; failure = reject; return 7 }), clear: vi.fn(), visible: () => visible, online: () => online, now: () => now, update: vi.fn(async () => share), stop: vi.fn(async () => ({ ...share, status: "ended" })) }
  const publisher = new LocationPublisher(environment)
  const position = { coords: { latitude: 10.7, longitude: 106.6, accuracy: 20 } } as GeolocationPosition
  return { publisher, environment, send: () => success(position), sendOld: () => callbacks[0]?.(position), deny: () => failure({ code: 1 } as GeolocationPositionError), advance: (ms: number) => { now += ms }, hide: () => { visible = false }, show: () => { visible = true }, offline: () => { online = false } }
}
describe("foreground live-location publisher", () => {
  it("starts no watcher before explicit sharing and enforces the initial five-second cadence", async () => {
    const state = harness()
    expect(state.environment.watch).not.toHaveBeenCalled()
    state.publisher.start(share, "tab-1")
    state.send(); expect(state.environment.update).not.toHaveBeenCalled()
    state.advance(5000); state.send(); await Promise.resolve()
    expect(state.environment.update).toHaveBeenCalledWith(share.conversationId, share.id, expect.objectContaining({ sequence: 1, publisherId: "tab-1" }))
    state.send(); expect(state.environment.update).toHaveBeenCalledTimes(1)
  })
  it("pauses in hidden tabs, clears watches, and never publishes an offline trail", () => {
    const state = harness(); state.publisher.start(share, "tab-1")
    state.hide(); state.publisher.refresh(); state.advance(6000); state.send()
    expect(state.environment.clear).toHaveBeenCalledWith(7)
    expect(state.environment.update).not.toHaveBeenCalled()
    expect(state.publisher.snapshot()[0].paused).toBe(true)
    state.show(); state.publisher.refresh()
    expect(state.environment.watch).toHaveBeenCalledTimes(2)
    state.offline(); state.publisher.refresh(); state.send()
    expect(state.environment.update).not.toHaveBeenCalled()
  })
  it("requires explicit resume after reload or permission denial", () => {
    const state = harness()
    state.publisher.restore([{ id: share.id, conversationId: share.conversationId, publisherId: "tab-1", sequence: 4, expiresAt: share.expiresAt, paused: false, error: null }])
    state.publisher.refresh(); expect(state.environment.watch).not.toHaveBeenCalled()
    state.publisher.resume(); expect(state.environment.watch).toHaveBeenCalledTimes(1)
    state.deny(); state.publisher.refresh(); expect(state.environment.watch).toHaveBeenCalledTimes(1)
    state.publisher.resume(); expect(state.environment.watch).toHaveBeenCalledTimes(2)
  })
  it("clears account-owned watchers at logout and rejects late callbacks", () => {
    const state = harness(); state.publisher.start(share, "tab-1")
    state.publisher.reset(); state.advance(6000); state.send()
    expect(state.environment.clear).toHaveBeenCalledWith(7)
    expect(state.environment.stop).toHaveBeenCalledWith(share.conversationId, share.id)
    expect(state.publisher.snapshot()).toEqual([])
    expect(state.environment.update).not.toHaveBeenCalled()
  })
  it("ends on expiry without waiting for a background browser timer", () => {
    const state = harness(); state.publisher.start(share, "tab-1")
    state.advance(3600000); state.publisher.refresh(); state.send()
    expect(state.publisher.snapshot()).toEqual([])
    expect(state.environment.update).not.toHaveBeenCalled()
  })
  it("never restarts a watcher or submits a second stop while stopping is pending", async () => {
    const state = harness()
    let finish: (value: LocationShareDto) => void = () => undefined
    vi.mocked(state.environment.stop).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    state.publisher.start(share, "tab-1")
    const stopping = state.publisher.stop(share.id)
    state.publisher.refresh()
    state.publisher.resume()
    await state.publisher.stop(share.id)
    state.advance(6000); state.send()
    expect(state.environment.watch).toHaveBeenCalledTimes(1)
    expect(state.environment.stop).toHaveBeenCalledTimes(1)
    expect(state.environment.update).not.toHaveBeenCalled()
    finish({ ...share, status: "ended" })
    await stopping
    expect(state.publisher.snapshot()).toEqual([])
  })
  it("ignores callbacks queued by a cleared watch after foreground tracking resumes", () => {
    const state = harness()
    state.publisher.start(share, "tab-1")
    state.hide(); state.publisher.refresh()
    state.show(); state.publisher.refresh(); state.advance(6000)
    state.sendOld()
    expect(state.environment.update).not.toHaveBeenCalled()
    state.send()
    expect(state.environment.update).toHaveBeenCalledTimes(1)
  })
})
