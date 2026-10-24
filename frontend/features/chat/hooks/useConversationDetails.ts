"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { ROLE, type InboxItemDto, type MessageDto, INBOX_FIELDS } from "@linko/contracts"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { getGroupNotificationPreference, setGroupMuted } from "@/features/settings/api/notification.api"
import { leaveGroup } from "@/features/groups/api/groupLifecycle.api"
import { mapAttachment } from "../chat.mapper"
import {
  CHAT_COPY,
  CHAT_DETAILS_COPY,
  CHAT_DETAILS_SECTIONS,
  CHAT_KIND,
  CHAT_QUERY_KEYS,
} from "../chat.constants"
import type {
  AttachmentViewModel,
  ChatAuthor,
  ChatKind,
  ConversationDetailsViewModel,
  ConversationMemberViewModel,
  ConversationPinViewModel,
} from "../chat.types"

/** Inputs to construct conversation details without coupling to layout markup. */
export interface UseConversationDetailsInput {
  readonly item: InboxItemDto
  readonly kind: ChatKind
  readonly messages: readonly MessageDto[]
  readonly membersData?: readonly { userId: string; displayName: string | null; role: string }[]
  readonly pinsData?: readonly MessageDto[]
  readonly authors: readonly ChatAuthor[]
  readonly currentUserId: string
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onOpenSearch: () => void
}

/** Prepares view-ready details for direct chats and group conversations. Logic only. */
export function useConversationDetails(input: UseConversationDetailsInput): ConversationDetailsViewModel {
  const router = useRouter()
  const client = useQueryClient()
  const { item, kind, messages, membersData, pinsData, authors, currentUserId, isOpen, onClose, onOpenSearch } = input
  const conversationId = item[INBOX_FIELDS.ID]
  const isGroup = kind === CHAT_KIND.GROUP

  const [section, setSection] = useState<string>(
    isGroup ? CHAT_DETAILS_SECTIONS.MEMBERS : CHAT_DETAILS_SECTIONS.MEDIA
  )
  const toggleSection = (id: string) => {
    setSection((current) => (current === id ? "" : id))
  }

  const preference = useQuery({
    queryKey: [CHAT_QUERY_KEYS.PREFERENCE, conversationId],
    queryFn: () => getGroupNotificationPreference(conversationId),
    enabled: isGroup && isOpen,
  })

  const muteMutation = useMutation({
    mutationFn: (isMuted: boolean) => setGroupMuted({ conversationId, isMuted }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [CHAT_QUERY_KEYS.PREFERENCE, conversationId] })
    },
  })

  const leaveMutation = useMutation({
    mutationFn: () => leaveGroup(conversationId),
    onSuccess: () => {
      onClose()
      router.replace(APP_ROUTES.INBOX)
    },
  })

  const peer = item.participants.find((p) => p.id !== currentUserId)
  const title = item.group?.name ?? peer?.displayName ?? CHAT_COPY.PRIVATE
  const avatarUrl = isGroup ? item.group?.avatarUrl ?? null : peer?.avatarUrl ?? null
  const description = item.group?.description ?? ""

  const members: ConversationMemberViewModel[] = isGroup
    ? (membersData ?? []).map((member) => {
        const matchedAuthor = authors.find((author) => author.id === member.userId)
        return {
          id: member.userId,
          name: member.displayName ?? matchedAuthor?.name ?? CHAT_COPY.MEMBER,
          avatarUrl: matchedAuthor?.avatarUrl ?? null,
          roleLabel:
            member.role === ROLE.OWNER
              ? "Chủ nhóm"
              : member.role === ROLE.ADMIN
                ? "Quản trị viên"
                : "Thành viên",
          isOwner: member.role === ROLE.OWNER,
        }
      })
    : peer
      ? [
          {
            id: peer.id,
            name: peer.displayName ?? CHAT_COPY.PRIVATE,
            avatarUrl: peer.avatarUrl ?? null,
            roleLabel: "Bạn bè",
            isOwner: false,
          },
        ]
      : []

  const subtitle = isGroup ? `${members.length} thành viên` : "Trò chuyện trực tiếp"

  const photos: AttachmentViewModel[] = []
  const files: AttachmentViewModel[] = []
  for (const message of messages) {
    for (const attachment of message.attachments ?? []) {
      const mapped = mapAttachment(attachment, message.id)
      if (attachment.contentType?.startsWith("image/")) {
        photos.push(mapped)
      } else {
        files.push(mapped)
      }
    }
  }

  const pins: ConversationPinViewModel[] = (pinsData ?? []).map((pin) => {
    const author = authors.find((a) => a.id === pin.senderId)?.name ?? CHAT_COPY.MEMBER
    return {
      id: pin.id,
      content: pin.content ?? (pin.attachments?.length ? "Tệp đính kèm" : ""),
      createdAt: new Date(pin.createdAt).toLocaleDateString("vi-VN"),
      author,
    }
  })

  const manageHref = isGroup
    ? buildAppRoute(APP_ROUTES.GROUP_MANAGE, { conversationId })
    : null
  const invitationsHref = isGroup
    ? buildAppRoute(APP_ROUTES.GROUP_INVITATIONS, { conversationId })
    : null

  const onToggleMute = () => {
    if (!isGroup) return
    const currentMuted = Boolean(preference.data?.isMuted)
    muteMutation.mutate(!currentMuted)
  }

  const onLeaveGroup = () => {
    if (!isGroup) return
    if (window.confirm(CHAT_DETAILS_COPY.LEAVE_CONFIRM)) {
      leaveMutation.mutate()
    }
  }

  return {
    isOpen,
    title,
    subtitle,
    description,
    avatarUrl,
    kind,
    isMuted: Boolean(preference.data?.isMuted),
    isMuteLoading: preference.isPending || muteMutation.isPending,
    isLeaving: leaveMutation.isPending,
    section,
    members,
    photos,
    files,
    pins,
    manageHref,
    invitationsHref,
    onToggleSection: toggleSection,
    onToggleMute,
    onLeaveGroup,
    onOpenSearch,
    onClose,
  }
}
