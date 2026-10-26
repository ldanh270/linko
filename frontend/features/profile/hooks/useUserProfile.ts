"use client"

import { useQuery } from "@tanstack/react-query"
import type { ProfileDto, PublicUserDto } from "@linko/contracts"
import { usePresence } from "@/shared/presence/usePresence"
import { useCurrentProfile } from "./useCurrentProfile"
import { useProfileEditor } from "./useProfileEditor"
import { getPublicUser } from "../api/profile.api"
import { listFriends } from "@/features/people/api/people.api"
import { useFriendActions } from "@/features/people/hooks/useFriendActions"
import { PEOPLE_QUERY_KEYS } from "@/features/people/people.constants"

export interface OwnProfileState {
  readonly isOwnProfile: true
  readonly user: ProfileDto | undefined
  readonly editor: ReturnType<typeof useProfileEditor>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
}

export interface OtherUserProfileState {
  readonly isOwnProfile: false
  readonly user: PublicUserDto | undefined
  readonly editor: null
  readonly isOnline: boolean
  readonly isFriend: boolean
  readonly isRequested: boolean
  readonly onOpenChat: () => void
  readonly onRequestFriend: () => void
  readonly isChatPending: boolean
  readonly isRequestPending: boolean
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
}

export type UserProfileState = OwnProfileState | OtherUserProfileState

/** Coordinate own profile management or another user's public profile view. Logic only. */
export function useUserProfile(targetUserId?: string): UserProfileState {
  const currentProfile = useCurrentProfile()
  const myId = currentProfile.data?.id
  const isOwnProfile = !targetUserId || targetUserId === myId

  const editor = useProfileEditor()
  const actions = useFriendActions()

  const publicQuery = useQuery({
    queryKey: [PEOPLE_QUERY_KEYS.PROFILE, targetUserId],
    queryFn: () => getPublicUser(targetUserId as string),
    enabled: Boolean(targetUserId && !isOwnProfile),
  })

  const friendsQuery = useQuery({
    queryKey: [PEOPLE_QUERY_KEYS.FRIENDS],
    queryFn: listFriends,
    enabled: Boolean(targetUserId && !isOwnProfile),
  })

  const presence = usePresence(targetUserId && !isOwnProfile ? [targetUserId] : [])
  const isOnline = targetUserId ? presence.isOnline(targetUserId) : false
  const isFriend = Boolean(friendsQuery.data?.some((friend) => friend.id === targetUserId))
  const isRequested = Boolean(targetUserId && actions.requestedIds.has(targetUserId))

  const onOpenChat = () => {
    if (targetUserId) {
      actions.openChat.mutate(targetUserId)
    }
  }

  const onRequestFriend = () => {
    if (targetUserId) {
      actions.request.mutate({ recipientId: targetUserId })
    }
  }

  if (isOwnProfile) {
    return {
      isOwnProfile: true,
      user: editor.query.data,
      editor,
      isLoading: editor.query.isPending,
      isError: editor.query.isError,
      onRetry: editor.onRetry,
    }
  }

  return {
    isOwnProfile: false,
    user: publicQuery.data,
    editor: null,
    isOnline,
    isFriend,
    isRequested,
    onOpenChat,
    onRequestFriend,
    isChatPending: actions.openChat.isPending,
    isRequestPending: actions.request.isPending,
    isLoading: publicQuery.isPending,
    isError: publicQuery.isError,
    onRetry: () => void publicQuery.refetch(),
  }
}
