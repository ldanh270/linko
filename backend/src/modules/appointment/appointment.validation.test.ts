import { describe, expect, it } from "vitest"
import { validateAppointmentTime, validateReminderTime } from "./appointment.validation"

const now = new Date("2026-11-05T00:00:00Z")

describe("appointment temporal rules", () => {
    it("rejects past starts, inverted ends, invalid zones and offset-free instants", () => {
        const valid = { startsAt: "2026-11-05T12:00:00+07:00", timezone: "Asia/Ho_Chi_Minh" }
        expect(() => validateAppointmentTime(valid, now)).not.toThrow()
        expect(() => validateAppointmentTime({ ...valid, startsAt: now.toISOString() }, now)).toThrow()
        expect(() => validateAppointmentTime({ ...valid, startsAt: "2026-11-05T12:00:00" }, now)).toThrow()
        expect(() => validateAppointmentTime({ ...valid, endsAt: "2026-11-05T04:00:00Z" }, now)).toThrow()
        expect(() => validateAppointmentTime({ ...valid, timezone: "Not/A_Zone" }, now)).toThrow()
    })

    it("requires future finite private reminder instants", () => {
        expect(() => validateReminderTime("2026-11-05T01:00:00Z", now)).not.toThrow()
        expect(() => validateReminderTime("invalid", now)).toThrow()
        expect(() => validateReminderTime(now.toISOString(), now)).toThrow()
    })
})
