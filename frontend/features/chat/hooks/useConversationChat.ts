"use client"

import { useEffect, useMemo, useRef } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MESSAGE_FIELDS, type CursorPage, type MessageDto } from "@linko/contracts"
import type { InfiniteData } from "@tanstack/react-query"
import { useCurrentProfile } from "@/features/profile/hooks/useCurrentProfile"
import { updateInboxItemWithNewMessage } from "@/features/inbox/inbox.cache"
import { notificationSound } from "@/shared/sound/notificationSound"
import { listMessages, sendMessage } from "../api/messages.api"
import { sendMessageFiles } from "../api/attachments.api"
import { getSharedChatSocket, mergeMessageById, subscribeToConversation } from "../api/chatSocket"
import { CHAT_QUERY_KEYS } from "../chat.constants"

const FRESH_MESSAGE_MAX_AGE_MS = 10_000

function isFreshMessage(createdAt: string): boolean {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  return ageMs >= 0 && ageMs < FRESH_MESSAGE_MAX_AGE_MS
}

interface SendMessageMutationInput {
  readonly clientMessageId: string
  readonly content: string
  readonly replyTo?: string
  readonly mentions: readonly string[]
  readonly files: readonly File[]
}

/** Load a conversation timeline, synchronize realtime events, and manage optimistic messaging. */
export function useConversationChat(conversationId: string) {
  const profile = useCurrentProfile()
  const currentUserId = profile.data?.id
  const currentUserIdRef = useRef(currentUserId)
  currentUserIdRef.current = currentUserId

  const queryClient = useQueryClient()
  const queryKey = useMemo(() => [CHAT_QUERY_KEYS.MESSAGES, conversationId] as const, [conversationId])
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listMessages({ conversationId, ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const send = useMutation({
    mutationFn: (input: SendMessageMutationInput) => {
      const request = {
        conversationId,
        content: input.content,
        clientMessageId: input.clientMessageId,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
        ...(input.mentions.length ? { mentions: input.mentions } : {}),
      }
      return input.files.length ? sendMessageFiles({ ...request, files: input.files }) : sendMessage(request)
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<InfiniteData<CursorPage<MessageDto>, string | undefined>>(queryKey)

      const optimisticMessage: MessageDto = {
        id: `temp-${input.clientMessageId}`,
        conversationId,
        senderId: currentUserIdRef.current ?? "",
        clientMessageId: input.clientMessageId,
        content: input.content,
        replyTo: input.replyTo ?? null,
        mentions: input.mentions,
        attachments: input.files.map((file, idx) => ({
          id: `temp-att-${idx}`,
          url: URL.createObjectURL(file),
          name: file.name,
          contentType: file.type,
          size: file.size,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<InfiniteData<CursorPage<MessageDto>, string | undefined>>(queryKey, (current) => {
        if (!current) {
          return {
            pages: [{ items: [optimisticMessage], nextCursor: null }],
            pageParams: [undefined],
          }
        }
        return {
          ...current,
          pages: current.pages.map((page, index) =>
            index === 0 ? { ...page, items: mergeMessageById(page.items, optimisticMessage) } : page,
          ),
        }
      })

      updateInboxItemWithNewMessage(queryClient, optimisticMessage, {
        displayName: profile.data?.displayName,
        avatarUrl: profile.data?.avatarUrl,
        incrementUnread: false,
      })

      return { previousData }
    },
    onError: (_err, _input, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
    },
    onSuccess: (message) => {
      queryClient.setQueryData<InfiniteData<CursorPage<MessageDto>, string | undefined>>(queryKey, (current) => {
        if (!current) return current
        return {
          ...current,
          pages: current.pages.map((page, index) =>
            index === 0 ? { ...page, items: mergeMessageById(page.items, message) } : page,
          ),
        }
      })
      updateInboxItemWithNewMessage(queryClient, message, {
        displayName: profile.data?.displayName,
        avatarUrl: profile.data?.avatarUrl,
        incrementUnread: false,
      })
    },
  })

  useEffect(() => {
    if (!conversationId) return
    const socket = getSharedChatSocket()
    const cachedMessages =
      queryClient.getQueryData<InfiniteData<CursorPage<MessageDto>, string | undefined>>(queryKey)?.pages.flatMap((page) => page.items) ?? []

    const unsubscribe = subscribeToConversation(
      socket,
      conversationId,
      (message) => {
        queryClient.setQueryData<InfiniteData<CursorPage<MessageDto>, string | undefined>>(queryKey, (current) => {
          if (!current) {
            return {
              pages: [{ items: [message], nextCursor: null }],
              pageParams: [undefined],
            }
          }
          return {
            ...current,
            pages: current.pages.map((page, index) =>
              index === 0 ? { ...page, items: mergeMessageById(page.items, message) } : page,
            ),
          }
        })
        if (
          isFreshMessage(message[MESSAGE_FIELDS.CREATED_AT]) &&
          currentUserIdRef.current &&
          message[MESSAGE_FIELDS.SENDER_ID] !== currentUserIdRef.current
        ) {
          notificationSound.play()
        }
        updateInboxItemWithNewMessage(queryClient, message, { incrementUnread: false })
      },
      { initialMessages: cachedMessages },
    )

    return () => {
      unsubscribe()
    }
  }, [conversationId, queryClient, queryKey])

  const messages = query.data?.pages.flatMap((page) => page.items) ?? []
  return { query, messages, send }
}
