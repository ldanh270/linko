import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { usePushNotifications } from "./usePushNotifications"

afterEach(() => vi.unstubAllGlobals())

describe("notification permission controls", () => {
  it("requests permission only from an explicit action and blocks duplicate prompts", async () => {
    let complete: (value: NotificationPermission) => void = () => {}
    const requestPermission = vi.fn(() => new Promise<NotificationPermission>((resolve) => { complete = resolve }))
    vi.stubGlobal("Notification", { permission: "default", requestPermission })
    const { result } = renderHook(() => usePushNotifications())
    expect(requestPermission).not.toHaveBeenCalled()
    act(() => { result.current.onEnable(); result.current.onEnable() })
    expect(requestPermission).toHaveBeenCalledTimes(1)
    expect(result.current.isRequesting).toBe(true)
    await act(async () => complete("granted"))
    expect(result.current.permission).toBe("granted")
    expect(result.current.isDisabled).toBe(true)
  })
  it("keeps denied permission disabled and does not re-prompt", async () => {
    const requestPermission = vi.fn()
    vi.stubGlobal("Notification", { permission: "denied", requestPermission })
    const { result } = renderHook(() => usePushNotifications())
    await act(async () => { await result.current.requestPermission() })
    expect(result.current.isDisabled).toBe(true)
    expect(requestPermission).not.toHaveBeenCalled()
  })
})
