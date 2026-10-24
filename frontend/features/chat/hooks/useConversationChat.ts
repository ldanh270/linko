"use client"

import { useEffect, useState } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MESSAGE_FIELDS, type CursorPage, type MessageDto } from "@linko/contracts"
import type { InfiniteData } from "@tanstack/react-query"
import { listMessages, sendMessage } from "../api/messages.api"
import { sendMessageFiles } from "../api/attachments.api"
import { createChatSocket, mergeMessageById, subscribeToConversation } from "../api/chatSocket"
import { CHAT_QUERY_KEYS } from "../chat.constants"

/** Load a conversation timeline, synchronize realtime events, and send messages. */
export function useConversationChat(conversationId: string) {
  const queryClient = useQueryClient()
  const queryKey = [CHAT_QUERY_KEYS.MESSAGES, conversationId] as const
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listMessages({ conversationId, ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
  const [liveMessages, setLiveMessages] = useState<readonly MessageDto[]>([])
  const send = useMutation({
    mutationFn: (input: { readonly clientMessageId: string; readonly content: string; readonly replyTo?: string; readonly mentions: readonly string[]; readonly files: readonly File[] }) => {
      const request = { conversationId, content: input.content, clientMessageId: input.clientMessageId, ...(input.replyTo ? { replyTo: input.replyTo } : {}), ...(input.mentions.length ? { mentions: input.mentions } : {}) }
      return input.files.length ? sendMessageFiles({ ...request, files: input.files }) : sendMessage(request)
    },
    onSuccess: (message) => queryClient.setQueryData<InfiniteData<CursorPage<MessageDto>, string | undefined>>(queryKey, (current) => current ? { ...current, pages: current.pages.map((page, index) => index === 0 ? { ...page, items: mergeMessageById(page.items, message) } : page) } : current),
  })
  useEffect(() => {
    if (!conversationId) return
    const socket = createChatSocket()
    const unsubscribe = subscribeToConversation(socket, conversationId, (message) => setLiveMessages((current) => mergeMessageById(current, message)))
    return () => { unsubscribe(); socket.disconnect() }
  }, [conversationId])
  const messages = [...(query.data?.pages.flatMap((page) => page.items) ?? []), ...liveMessages].filter((message) => message[MESSAGE_FIELDS.CONVERSATION_ID] === conversationId).reduce<MessageDto[]>((all, message) => mergeMessageById(all, message), [])
  return { query, messages, send }
}
