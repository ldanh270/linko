"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  CONVERSATION_TYPE,
  FRIEND_REQUEST_DIRECTION,
  FRIEND_REQUEST_FIELDS,
  INBOX_FIELDS,
  USER_PROFILE_FIELDS,
  type FriendRequestDto,
  type InboxItemDto,
} from "@linko/contracts"
import { listFriendRequests } from "@/features/people/api/people.api"
import { PEOPLE_QUERY_KEYS } from "@/features/people/people.constants"
import { useFriendActions } from "@/features/people/hooks/useFriendActions"
import { listInbox } from "@/features/inbox/api/inbox.api"
import { INBOX_QUERY_KEY } from "@/features/inbox/inbox.constants"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { usePushNotifications } from "./usePushNotifications"

export type NotificationFilter = "all" | "requests" | "messages"

export interface NotificationItem {
  readonly id: string
  readonly type: "friend_request" | "message" | "system"
  readonly title: string
  readonly description: string
  readonly avatarUrl?: string | null
  readonly time: string
  readonly isUnread: boolean
  readonly onAction?: () => void
  readonly actionLabel?: string
  readonly secondaryAction?: () => void
  readonly secondaryActionLabel?: string
}

/** Aggregate and manage real notifications and user filter preferences. */
export function useNotificationsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<NotificationFilter>("all")
  const push = usePushNotifications()
  const friendActions = useFriendActions()

  const requestsQuery = useQuery({
    queryKey: [PEOPLE_QUERY_KEYS.REQUESTS, FRIEND_REQUEST_DIRECTION.RECEIVED],
    queryFn: () => listFriendRequests(FRIEND_REQUEST_DIRECTION.RECEIVED),
  })

  const inboxQuery = useQuery({
    queryKey: [INBOX_QUERY_KEY],
    queryFn: () => listInbox(),
  })

  // 1. Friend requests
  const requestItems: NotificationItem[] = (requestsQuery.data ?? []).map((req: FriendRequestDto) => {
    const fromUser = req[FRIEND_REQUEST_FIELDS.FROM]
    const reqId = req[FRIEND_REQUEST_FIELDS.ID]
    const title = fromUser[USER_PROFILE_FIELDS.DISPLAY_NAME] || fromUser[USER_PROFILE_FIELDS.USERNAME] || "Một người dùng"
    const createdAt = req[FRIEND_REQUEST_FIELDS.CREATED_AT]

    return {
      id: `req-${reqId}`,
      type: "friend_request",
      title,
      description: req[FRIEND_REQUEST_FIELDS.MESSAGE] || "Đã gửi cho bạn một lời mời kết bạn mới.",
      avatarUrl: fromUser[USER_PROFILE_FIELDS.AVATAR_URL],
      time: createdAt ? new Date(createdAt).toLocaleDateString("vi-VN") : "Gần đây",
      isUnread: true,
      actionLabel: "Chấp nhận",
      onAction: () => friendActions.accept.mutate(reqId),
      secondaryActionLabel: "Từ chối",
      secondaryAction: () => friendActions.decline.mutate(reqId),
    }
  })

  // 2. Recent unread messages or conversations
  const messageItems: NotificationItem[] = (inboxQuery.data?.items ?? [])
    .filter((conv: InboxItemDto) => (conv[INBOX_FIELDS.UNREAD_COUNT] ?? 0) > 0 || conv[INBOX_FIELDS.LAST_MESSAGE])
    .slice(0, 10)
    .map((conv: InboxItemDto) => {
      const convId = conv[INBOX_FIELDS.ID]
      const unreadCount = conv[INBOX_FIELDS.UNREAD_COUNT] ?? 0
      const isUnread = unreadCount > 0
      const group = conv[INBOX_FIELDS.GROUP]
      const firstParticipant = conv[INBOX_FIELDS.PARTICIPANTS][0]
      const title = group?.name || firstParticipant?.displayName || "Tin nhắn mới"
      const lastMessage = conv[INBOX_FIELDS.LAST_MESSAGE]
      const description = lastMessage?.content || "Nhấn để mở cuộc trò chuyện..."
      const isGroup = conv[INBOX_FIELDS.TYPE] === CONVERSATION_TYPE.GROUP

      const conversationHref = isGroup
        ? buildAppRoute(APP_ROUTES.GROUP_CONVERSATION, { conversationId: convId })
        : buildAppRoute(APP_ROUTES.DIRECT_CONVERSATION, { conversationId: convId })

      return {
        id: `msg-${convId}`,
        type: "message",
        title,
        description: isUnread ? `(${unreadCount} tin mới) ${description}` : description,
        avatarUrl: group?.avatarUrl || firstParticipant?.avatarUrl,
        time: lastMessage?.createdAt ? new Date(lastMessage.createdAt).toLocaleDateString("vi-VN") : "Hôm nay",
        isUnread,
        actionLabel: "Xem tin nhắn",
        onAction: () => router.push(conversationHref),
      }
    })

  // 3. System Welcome Notification
  const systemItems: NotificationItem[] = [
    {
      id: "sys-welcome",
      type: "system",
      title: "Chào mừng đến với Linko!",
      description: "Hệ thống tin nhắn tức thì bảo mật và đồng bộ realtime đa nền tảng.",
      time: "Hệ thống",
      isUnread: false,
    },
  ]

  const allItems = [...requestItems, ...messageItems, ...systemItems]

  const filteredItems = allItems.filter((item) => {
    if (filter === "requests") return item.type === "friend_request"
    if (filter === "messages") return item.type === "message"
    return true
  })

  return {
    items: filteredItems,
    filter,
    setFilter,
    push,
    isLoading: requestsQuery.isPending || inboxQuery.isPending,
    isError: requestsQuery.isError || inboxQuery.isError,
    onRetry: () => {
      void requestsQuery.refetch()
      void inboxQuery.refetch()
    },
    totalUnread: requestItems.length + messageItems.filter((m) => m.isUnread).length,
  }
}
