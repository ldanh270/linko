"use client"

import {
    MESSAGE_FIELDS,
    NOTIFICATION_PREFERENCE_FIELDS,
    SOCKET_EVENTS,
    type MessageDto,
    type NotificationPreferenceDto,
} from "@linko/contracts"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { INBOX_QUERY_KEY } from "@/features/inbox/inbox.constants"
import { updateInboxItemWithNewMessage } from "@/features/inbox/inbox.cache"
import { getSharedChatSocket } from "@/features/chat/api/chatSocket"
import { CHAT_QUERY_KEYS } from "@/features/chat/chat.constants"
import { useToast } from "../../../shared/components/useToast"
import { notificationSound } from "../../../shared/sound/notificationSound"
import { getGroupNotificationPreference } from "../api/notification.api"
import { NOTIFICATION_TOAST_MESSAGES } from "../notification.constants"

/** Listen for private message events, update the inbox cache, and show eligible in-app toasts.
 *
 * Preference reads are intentionally fresh for each event so changes in another tab take effect.
 *
 * @returns Nothing; the hook owns one authenticated notification socket subscription.
 */
export function useNotificationToasts(activeConversationId: string | null): void {
    const toast = useToast()
    const queryClient = useQueryClient()
    const activeConversationIdRef = useRef(activeConversationId)
    const showToastRef = useRef(toast.show)

    useEffect(() => {
        activeConversationIdRef.current = activeConversationId
    }, [activeConversationId])

    useEffect(() => {
        showToastRef.current = toast.show
    }, [toast.show])

    useEffect(() => {
        const socket = getSharedChatSocket()
        let isDisposed = false

        const onMessageCreated = (message: MessageDto): void => {
            const isCurrent = isActiveConversation(message, activeConversationIdRef.current)
            updateInboxItemWithNewMessage(queryClient, message, {
                incrementUnread: !isCurrent,
            })
            void showMessageToast(message)
        }

        const onConversationUpdated = (): void => {
            void queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY })
            void queryClient.invalidateQueries({ queryKey: ["pins"] })
            void queryClient.invalidateQueries({ queryKey: [CHAT_QUERY_KEYS.MEMBERS] })
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
            notificationSound.play()
        }

        socket.on(SOCKET_EVENTS.MESSAGE_CREATED, onMessageCreated)
        socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated)
        return () => {
            isDisposed = true
            socket.off(SOCKET_EVENTS.MESSAGE_CREATED, onMessageCreated)
            socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated)
        }
    }, [queryClient])
}

function isActiveConversation(message: MessageDto, activeConversationId: string | null): boolean {
    return message[MESSAGE_FIELDS.CONVERSATION_ID] === activeConversationId
}
