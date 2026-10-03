import type { UserDto } from "@linko/contracts"

import { AUTH_FIELDS } from "./auth.constants"
import type { AuthUserRecord } from "./auth.types"

/** Map an internal auth record to the safe public account DTO. */
export function toUserDto(user: AuthUserRecord): UserDto {
    return {
        [AUTH_FIELDS.ID]: user[AUTH_FIELDS.ID],
        [AUTH_FIELDS.USERNAME]: user[AUTH_FIELDS.USERNAME],
        [AUTH_FIELDS.DISPLAY_NAME]: user[AUTH_FIELDS.DISPLAY_NAME],
        [AUTH_FIELDS.EMAIL]: user[AUTH_FIELDS.EMAIL],
    }
}
