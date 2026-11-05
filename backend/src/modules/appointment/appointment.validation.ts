import { ValidationException } from "../../shared/errors/ValidationException"
import { INSTANT_PATTERN, SCHEDULING_ERRORS } from "./appointment.constants"

/** Validate explicit UTC instants, IANA zone and future one-off ordering. */
export function validateAppointmentTime(input: { startsAt: string; endsAt?: string | null; timezone: string }, now: Date): void {
    validateReminderTime(input.startsAt, now)
    try { new Intl.DateTimeFormat("en", { timeZone: input.timezone }).format(now) }
    catch { throw new ValidationException(SCHEDULING_ERRORS.TIME) }
    if (input.endsAt && (!INSTANT_PATTERN.test(input.endsAt) || !Number.isFinite(Date.parse(input.endsAt)) || Date.parse(input.endsAt) <= Date.parse(input.startsAt))) {
        throw new ValidationException(SCHEDULING_ERRORS.END)
    }
}

/** Require a future explicit instant rather than an ambiguous browser-local value. */
export function validateReminderTime(instant: string, now: Date): void {
    if (!INSTANT_PATTERN.test(instant) || !Number.isFinite(Date.parse(instant)) || Date.parse(instant) <= now.getTime()) {
        throw new ValidationException(SCHEDULING_ERRORS.TIME)
    }
}
