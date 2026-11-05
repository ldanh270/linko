import { describe, expect, it } from "vitest"
import { localToInstant } from "./utility-time"

describe("appointment local time", () => {
  it("converts the explicitly selected timezone instead of the device zone", () => {
    expect(localToInstant("2026-11-06T19:30", "Asia/Ho_Chi_Minh")).toBe("2026-11-06T12:30:00.000Z")
  })
  it("rejects a nonexistent daylight-saving time", () => {
    expect(() => localToInstant("2027-03-14T02:30", "America/New_York")).toThrow()
  })
  it("requires an explicit choice for a repeated daylight-saving time", () => {
    expect(() => localToInstant("2026-11-01T01:30", "America/New_York")).toThrow()
    expect(localToInstant("2026-11-01T01:30", "America/New_York", "earlier")).toBe("2026-11-01T05:30:00.000Z")
    expect(localToInstant("2026-11-01T01:30", "America/New_York", "later")).toBe("2026-11-01T06:30:00.000Z")
  })
})
