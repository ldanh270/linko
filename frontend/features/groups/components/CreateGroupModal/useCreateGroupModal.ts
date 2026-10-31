"use client"

import { useState, type FormEvent, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { createGroup } from "../../api/groups.api"
import { issueInvitation } from "@/features/invitations/api/invitations.api"
import { listFriends, openDirectChat } from "@/features/people/api/people.api"
import { sendMessage } from "@/features/chat/api/messages.api"
import { PEOPLE_QUERY_KEYS } from "@/features/people/people.constants"
import { INBOX_QUERY_KEY } from "@/features/inbox/inbox.constants"
import { GROUP_QUERY_KEYS } from "../../group.constants"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { useToast } from "@/shared/components/useToast"
import { ApiError } from "@/shared/http/ApiError"
import type { FriendDto } from "@linko/contracts"

export interface UseCreateGroupModalOptions {
  readonly isOpen?: boolean
  readonly onClose: () => void
}

/**
 * Coordinate group creation, avatar file selection, friend checklist selection,
 * automatic direct invitation dispatching and navigation.
 * Adheres to SRP by keeping form state, queries and side-effects in a custom hook.
 */
export function useCreateGroupModal({ isOpen = true, onClose }: UseCreateGroupModalOptions) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | undefined>()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(() => new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Manage object URL for avatar preview
  useEffect(() => {
    if (!avatarFile) {
      return
    }
    let isActive = true
    const objectUrl = URL.createObjectURL(avatarFile)
    queueMicrotask(() => {
      if (isActive) setAvatarPreview(objectUrl)
    })
    return () => {
      isActive = false
      URL.revokeObjectURL(objectUrl)
      setAvatarPreview(null)
    }
  }, [avatarFile])

  // Fetch current user's friends for the checklist
  const friendsQuery = useQuery({
    queryKey: [PEOPLE_QUERY_KEYS.FRIENDS],
    queryFn: listFriends,
    enabled: isOpen,
  })

  const friends = useMemo<readonly FriendDto[]>(() => friendsQuery.data ?? [], [friendsQuery.data])

  // Filter friends according to the in-modal search box
  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return friends
    return friends.filter(
      (f) =>
        f.username.toLowerCase().includes(q) ||
        (f.displayName && f.displayName.toLowerCase().includes(q)),
    )
  }, [friends, searchQuery])

  // List of selected friend objects
  const selectedFriends = useMemo(() => {
    return friends.filter((f) => selectedFriendIds.has(f.id))
  }, [friends, selectedFriendIds])

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev)
      if (next.has(friendId)) {
        next.delete(friendId)
      } else {
        next.add(friendId)
      }
      return next
    })
  }

  const handleAvatarChange = (file?: File) => {
    setAvatarFile(file)
  }

  const removeAvatar = () => {
    setAvatarFile(undefined)
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setAvatarFile(undefined)
    setSearchQuery("")
    setSelectedFriendIds(new Set())
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Create group via API
      const group = await createGroup({
        name: trimmedName,
        description: description.trim() || undefined,
        avatar: avatarFile,
      })

      // 2. If friends were selected, issue invitation and dispatch to their direct chats
      if (selectedFriendIds.size > 0) {
        try {
          const invitation = await issueInvitation(group.id, crypto.randomUUID())
          const invitePromises = Array.from(selectedFriendIds).map(async (friendId) => {
            try {
              const directChat = await openDirectChat(friendId)
              await sendMessage({
                conversationId: directChat.id,
                clientMessageId: crypto.randomUUID(),
                content: `👋 Mình vừa tạo nhóm "${trimmedName}". Mời bạn tham gia cùng nhé: ${invitation.url}`,
              })
            } catch {
              // Individual dispatch failure should not block group creation
            }
          })
          await Promise.allSettled(invitePromises)
        } catch {
          // Invitation issue failure should not block navigation to the new group
        }
      }

      // 3. Invalidate caches so the new group appears in inbox and sidebars
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: [GROUP_QUERY_KEYS.INFO, group.id] }),
      ])

      toast.show(`Đã tạo nhóm "${trimmedName}" thành công!`, "success")
      handleClose()

      // 4. Navigate directly to the new group chat
      router.push(buildAppRoute(APP_ROUTES.GROUP_CONVERSATION, { conversationId: group.id }))
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Không thể tạo nhóm. Vui lòng thử lại."
      setError(msg)
      toast.show(msg, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    name,
    setName,
    description,
    setDescription,
    avatarPreview,
    handleAvatarChange,
    removeAvatar,
    searchQuery,
    setSearchQuery,
    friendsQuery,
    friends,
    filteredFriends,
    selectedFriends,
    selectedFriendIds,
    toggleFriend,
    isSubmitting,
    error,
    handleSubmit,
    handleClose,
  }
}
