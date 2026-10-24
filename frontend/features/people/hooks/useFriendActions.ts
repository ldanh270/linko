"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useToast } from "@/shared/components/useToast"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { INBOX_QUERY_KEY } from "@/features/inbox/inbox.constants"
import { getSessionGeneration } from "@/features/auth/api/auth.api"
import { acceptFriend, declineFriend, openDirectChat, requestFriend } from "../api/people.api"
import { PEOPLE_QUERY_KEYS } from "../people.constants"

/** Own friend mutations, cache invalidation and consistent feedback outside JSX. */
export function useFriendActions() {
  const client = useQueryClient(), router = useRouter(), toast = useToast()
  const [requestedIds, setRequestedIds] = useState<ReadonlySet<string>>(() => new Set())
  const error = () => toast.show("Không thể thực hiện thao tác. Vui lòng thử lại.", "error")
  const request = useMutation({ mutationFn: requestFriend, onError: error, onSuccess: (_result, input) => { setRequestedIds((current) => new Set([...current, input.recipientId])); toast.show("Đã gửi lời mời kết bạn.", "success") } })
  const refreshFriends = async () => { await Promise.all([client.invalidateQueries({ queryKey: [PEOPLE_QUERY_KEYS.REQUESTS] }), client.invalidateQueries({ queryKey: [PEOPLE_QUERY_KEYS.FRIENDS] })]) }
  const accept = useMutation({ mutationFn: acceptFriend, onError: error, onSuccess: () => { toast.show("Đã chấp nhận lời mời.", "success"); return refreshFriends() } })
  const decline = useMutation({ mutationFn: declineFriend, onError: error, onSuccess: refreshFriends })
  const openChat = useMutation({ mutationFn: openDirectChat, onMutate: getSessionGeneration, onError: error, onSuccess: async (conversation, _input, generation) => {
    if (generation !== getSessionGeneration()) return
    await client.invalidateQueries({ queryKey: INBOX_QUERY_KEY })
    router.push(buildAppRoute(APP_ROUTES.DIRECT_CONVERSATION, { conversationId: conversation.id }))
  } })
  return { request, accept, decline, openChat, requestedIds }
}
