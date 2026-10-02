import { MEMBERSHIP_FIELDS, READ_FIELDS, READ_REQUEST_FIELDS } from "@linko/contracts"

/** Stable safe messages used by the read-state service. */
export const READ_ERROR_MESSAGES = {
    NOT_A_MEMBER: "Current conversation membership is required",
    MESSAGE_NOT_VISIBLE: "The message is not visible to the current membership",
} as const

/** Read-state operation field names shared by controller and service mapping. */
export const READ_OPERATION_FIELDS = {
    CONVERSATION_ID: READ_FIELDS.CONVERSATION_ID,
    USER_ID: MEMBERSHIP_FIELDS.USER_ID,
    LAST_VISIBLE_MESSAGE_ID: READ_REQUEST_FIELDS.LAST_VISIBLE_MESSAGE_ID,
    LAST_READ_AT: READ_FIELDS.LAST_READ_AT,
    LAST_READ_MESSAGE_ID: READ_FIELDS.LAST_READ_MESSAGE_ID,
    UNREAD_COUNT: READ_FIELDS.UNREAD_COUNT,
} as const
