"use client"

import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listMembers } from "@/features/membership/api/membership.api"
import { listPins } from "../api/pins.api"
import { getGroupNotificationPreference, setGroupMuted } from "@/features/settings/api/notification.api"
import { leaveGroup } from "../api/groupLifecycle.api"
import { findGroupInInbox } from "../api/groups.api"
import { APP_ROUTES } from "@/shared/layout/route.constants"

/**
 * Custom hook coordinating group info queries, notification preferences,
 * member inspection, pinned messages, and group departure.
 * Adheres to Single Responsibility Principle (SRP) by isolating state and side-effects from JSX.
 *
 * @returns State and mutation handlers for the GroupInfoPage.
 */
export function useGroupInfoPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const router = useRouter()
  const client = useQueryClient()

  // 1. Fetch group profile from inbox
  const query = useQuery({
    queryKey: ["group-info", conversationId],
    queryFn: () => findGroupInInbox(conversationId),
  })

  // 2. Fetch group member directory
  const membersQuery = useQuery({
    queryKey: ["members", conversationId],
    queryFn: () => listMembers(conversationId),
  })

  // 3. Fetch pinned messages
  const pinsQuery = useQuery({
    queryKey: ["pins", conversationId],
    queryFn: () => listPins(conversationId),
  })

  // 4. Personal notification mute preference
  const preference = useQuery({
    queryKey: ["group-preference", conversationId],
    queryFn: () => getGroupNotificationPreference(conversationId),
  })

  const muteMutation = useMutation({
    mutationFn: (isMuted: boolean) => setGroupMuted({ conversationId, isMuted }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["group-preference", conversationId] }),
  })

  // 5. Leave group mutation
  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(conversationId),
    onSuccess: () => router.replace(APP_ROUTES.INBOX),
  })

  const toggleMute = () => {
    if (preference.data) {
      muteMutation.mutate(!preference.data.isMuted)
    }
  }

  const handleLeaveGroup = () => {
    if (window.confirm("Rời khỏi nhóm? Bạn sẽ mất quyền xem tin nhắn và tệp trong nhóm.")) {
      leaveMutation.mutate()
    }
  }

  return {
    conversationId,
    query,
    group: query.data?.group,
    membersQuery,
    members: membersQuery.data ?? [],
    pinsQuery,
    pins: pinsQuery.data ?? [],
    preference,
    isMuted: preference.data?.isMuted ?? false,
    isMutePending: muteMutation.isPending || preference.isPending,
    isMuteDisabled: preference.isError,
    toggleMute,
    isLeavePending: leaveMutation.isPending,
    handleLeaveGroup,
    hasActionError: muteMutation.isError || leaveMutation.isError,
  }
}
