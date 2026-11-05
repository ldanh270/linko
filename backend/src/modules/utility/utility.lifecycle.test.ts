import { afterEach, describe, expect, it, vi } from "vitest"
import { UTILITY_WORKER_TIMING } from "./utility.constants"
import { UtilityWorkers } from "./utility.lifecycle"

afterEach(() => vi.useRealTimers())
describe("utility worker lifecycle", () => {
  it("starts explicitly, prevents overlapping cleanup and drains before stopping", async () => {
    vi.useFakeTimers()
    let complete: () => void = () => undefined
    const cleanup = vi.fn(() => new Promise<void>((resolve) => { complete = resolve }))
    const scheduling = { start: vi.fn(), stop: vi.fn(async () => undefined) }
    const worker = new UtilityWorkers({ scheduling, cleanup, onError: vi.fn() })
    expect(cleanup).not.toHaveBeenCalled()
    worker.start()
    worker.start()
    await vi.advanceTimersByTimeAsync(UTILITY_WORKER_TIMING.CLEANUP_MS * 2)
    expect(cleanup).toHaveBeenCalledOnce()
    expect(scheduling.start).toHaveBeenCalledOnce()
    let stopped = false
    const shutdown = worker.stop().then(() => { stopped = true })
    await Promise.resolve()
    expect(stopped).toBe(false)
    complete()
    await shutdown
    await vi.advanceTimersByTimeAsync(UTILITY_WORKER_TIMING.CLEANUP_MS)
    expect(cleanup).toHaveBeenCalledOnce()
  })
  it("records technical maintenance errors and permits a subsequent tick", async () => {
    vi.useFakeTimers()
    const failure = new Error("isolated cleanup failure")
    const onError = vi.fn()
    const cleanup = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(undefined)
    const worker = new UtilityWorkers({ scheduling: { start: vi.fn(), stop: vi.fn(async () => undefined) }, cleanup, onError })
    worker.start()
    await vi.advanceTimersByTimeAsync(UTILITY_WORKER_TIMING.CLEANUP_MS)
    expect(cleanup).toHaveBeenCalledTimes(2)
    expect(onError).toHaveBeenCalledWith(failure)
    await worker.stop()
  })
})
