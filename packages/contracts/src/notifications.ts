import { NOTIFICATION_PREFERENCE_FIELDS } from "./constants"
import type { EntityId } from "./envelope"

/** Per-conversation toast preference returned for the authenticated participant. */
export interface NotificationPreferenceDto {
    readonly [NOTIFICATION_PREFERENCE_FIELDS.CONVERSATION_ID]: EntityId
    readonly [NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]: boolean
}

/** Boolean preference update accepted by the conversation notification endpoint. */
export interface SetNotificationPreferenceRequest {
    readonly [NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]: boolean
}
