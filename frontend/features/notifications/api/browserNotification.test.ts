import { afterEach, describe, expect, it, vi } from "vitest"
import { getBrowserNotificationPermission, showBrowserNotification } from "./browserNotification"

afterEach(() => vi.unstubAllGlobals())

describe("browser notification adapter", () => {
  it("does not prompt or throw when permission is denied", () => {
    const ctor = vi.fn()
    Object.assign(ctor, { permission: "denied", requestPermission: vi.fn() })
    vi.stubGlobal("Notification", ctor)
    expect(getBrowserNotificationPermission()).toBe("denied")
    expect(showBrowserNotification({ title: "Title", body: "Body", tag: "id", onClick: vi.fn() })).toBe(false)
    expect(ctor).not.toHaveBeenCalled()
  })
  it("silences native audio and focuses the app before navigation", () => {
    const native = { close: vi.fn(), onclick: null as (() => void) | null }
    const ctor = vi.fn(() => native)
    Object.assign(ctor, { permission: "granted" })
    vi.stubGlobal("Notification", ctor)
    const focus = vi.spyOn(window, "focus").mockImplementation(() => {})
    const onClick = vi.fn()
    expect(showBrowserNotification({ title: "Title", body: "Body", tag: "id", onClick })).toBe(true)
    expect(ctor).toHaveBeenCalledWith("Title", expect.objectContaining({ silent: true, tag: "id" }))
    native.onclick?.()
    expect(native.close).toHaveBeenCalledOnce()
    expect(focus).toHaveBeenCalledOnce()
    expect(onClick).toHaveBeenCalledOnce()
    focus.mockRestore()
  })
})
