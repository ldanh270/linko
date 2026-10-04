"use client"

import {
    MESSAGE_FIELDS,
    NOTIFICATION_PREFERENCE_FIELDS,
    SOCKET_EVENTS,
    type MessageDto,
    type NotificationPreferenceDto,
} from "@linko/contracts"
import { useEffect, useRef } from "react"

import { createChatSocket } from "../../chat/api/chatSocket"
import { useToast } from "../../../shared/components/useToast"
import { getGroupNotificationPreference } from "../api/notification.api"
import { NOTIFICATION_TOAST_MESSAGES } from "../notification.constants"

/** Listen for private message events and show only eligible in-app toasts.
 *
 * Preference reads are intentionally fresh for each event so changes in another tab take effect.
 *
 * @returns Nothing; the hook owns one authenticated notification socket subscription.
 */
export function useNotificationToasts(activeConversationId: string | null): void {
    const toast = useToast()
    const activeConversationIdRef = useRef(activeConversationId)
    const showToastRef = useRef(toast.show)

    useEffect(() => {
        activeConversationIdRef.current = activeConversationId
    }, [activeConversationId])

    useEffect(() => {
        showToastRef.current = toast.show
    }, [toast.show])

    useEffect(() => {
        const socket = createChatSocket()
        let isDisposed = false

        const onMessageCreated = (message: MessageDto): void => {
            void showMessageToast(message)
        }

        const showMessageToast = async (message: MessageDto): Promise<void> => {
            if (isDisposed || isActiveConversation(message, activeConversationIdRef.current)) return

            let preference: NotificationPreferenceDto
            try {
                preference = await getGroupNotificationPreference(message[MESSAGE_FIELDS.CONVERSATION_ID])
            } catch {
                return
            }

            if (isDisposed || preference[NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]) return
            if (isActiveConversation(message, activeConversationIdRef.current)) return
            showToastRef.current(NOTIFICATION_TOAST_MESSAGES.NEW_MESSAGE)
        }

        socket.on(SOCKET_EVENTS.MESSAGE_CREATED, onMessageCreated)
        return () => {
            isDisposed = true
            socket.off(SOCKET_EVENTS.MESSAGE_CREATED, onMessageCreated)
            socket.disconnect()
        }
    }, [])
}

function isActiveConversation(message: MessageDto, activeConversationId: string | null): boolean {
    return message[MESSAGE_FIELDS.CONVERSATION_ID] === activeConversationId
}
