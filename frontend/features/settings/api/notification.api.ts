import {
    API_ROUTES,
    CONVERSATION_PARAMS,
    NOTIFICATION_PREFERENCE_REQUEST_FIELDS,
    NOTIFICATION_PREFERENCE_ROUTE_PATHS,
    type NotificationPreferenceDto,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"

/** One boolean preference update for the authenticated participant. */
export interface SetGroupMutedInput {
    readonly conversationId: string
    readonly isMuted: boolean
}

/** Read the authenticated participant's notification preference for a conversation.
 *
 * @param conversationId - MongoDB conversation identifier.
 * @returns The preference DTO or a normalized shared-client API error.
 */
export function getGroupNotificationPreference(conversationId: string): Promise<NotificationPreferenceDto> {
    return authenticatedApiClient.request({ path: preferencePath(conversationId) })
}

/** Set or restore one participant's group notification preference.
 *
 * @param input - Conversation identifier and requested mute state.
 * @returns The persisted preference DTO or a normalized shared-client API error.
 */
export function setGroupMuted(input: SetGroupMutedInput): Promise<NotificationPreferenceDto> {
    return authenticatedApiClient.request({
        path: preferencePath(input.conversationId),
        method: "PUT",
        body: { [NOTIFICATION_PREFERENCE_REQUEST_FIELDS.IS_MUTED]: input.isMuted },
    })
}

function preferencePath(conversationId: string): string {
    const route = NOTIFICATION_PREFERENCE_ROUTE_PATHS.BY_CONVERSATION.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        conversationId,
    )
    return `${API_ROUTES.CONVERSATIONS}${route}`
}
