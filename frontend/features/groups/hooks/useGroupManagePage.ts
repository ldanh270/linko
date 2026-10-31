"use client"

import { useState, type FormEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ROLE } from "@linko/contracts"
import { changeRole, listMembers, removeMember, transferOwner } from "@/features/membership/api/membership.api"
import { closeGroup } from "../api/groupLifecycle.api"
import { findGroupInInbox, updateGroup } from "../api/groups.api"
import { APP_ROUTES } from "@/shared/layout/route.constants"

/**
 * Coordinate group administrative operations:
 * - Title and description draft editing
 * - Role escalation / demotion
 * - Member removal and ownership transfer
 * - Group closure lifecycle
 *
 * @returns ViewModel and action handlers for GroupManagePage.
 */
export function useGroupManagePage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const router = useRouter()
  const client = useQueryClient()

  const queryKey = ["group-manage", conversationId] as const
  const query = useQuery({
    queryKey,
    queryFn: () => findGroupInInbox(conversationId),
  })

  const membersQuery = useQuery({
    queryKey: ["members", conversationId],
    queryFn: () => listMembers(conversationId),
  })

  const group = query.data?.group

  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null)

  const name = nameDraft ?? group?.name ?? ""
  const description = descriptionDraft ?? group?.description ?? ""

  const refreshQueries = () =>
    Promise.all([
      client.invalidateQueries({ queryKey }),
      client.invalidateQueries({ queryKey: ["members", conversationId] }),
    ])

  const saveMutation = useMutation({
    mutationFn: () => updateGroup({ id: conversationId, name, description }),
    onSuccess: () => refreshQueries(),
  })

  const updateRoleMutation = useMutation({
    mutationFn: (input: { userId: string; role: typeof ROLE.ADMIN | typeof ROLE.MEMBER }) =>
      changeRole({ conversationId, ...input }),
    onSuccess: () => refreshQueries(),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeMember({ conversationId, userId }),
    onSuccess: () => refreshQueries(),
  })

  const transferOwnerMutation = useMutation({
    mutationFn: (newOwnerId: string) => transferOwner({ conversationId, newOwnerId }),
    onSuccess: () => refreshQueries(),
  })

  const closeGroupMutation = useMutation({
    mutationFn: () => closeGroup(conversationId),
    onSuccess: () => router.replace(APP_ROUTES.INBOX),
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim()) {
      saveMutation.mutate()
    }
  }

  const handleToggleRole = (userId: string, currentRole: string) => {
    const nextRole = currentRole === ROLE.ADMIN ? ROLE.MEMBER : ROLE.ADMIN
    updateRoleMutation.mutate({ userId, role: nextRole })
  }

  const handleTransfer = (newOwnerId: string) => {
    if (window.confirm("Chuyển quyền chủ nhóm cho thành viên này?")) {
      transferOwnerMutation.mutate(newOwnerId)
    }
  }

  const handleRemove = (userId: string) => {
    if (window.confirm("Xóa thành viên khỏi nhóm?")) {
      removeMemberMutation.mutate(userId)
    }
  }

  const handleClose = () => {
    if (window.confirm("Đóng nhóm này? Thao tác này sẽ dừng trò chuyện và thu hồi lời mời.")) {
      closeGroupMutation.mutate()
    }
  }

  const hasActionError =
    saveMutation.isError ||
    updateRoleMutation.isError ||
    removeMemberMutation.isError ||
    transferOwnerMutation.isError ||
    closeGroupMutation.isError

  return {
    conversationId,
    query,
    group,
    membersQuery,
    members: membersQuery.data ?? [],
    name,
    setName: setNameDraft,
    description,
    setDescription: setDescriptionDraft,
    isSaving: saveMutation.isPending,
    isUpdatingRole: updateRoleMutation.isPending,
    isRemovingMember: removeMemberMutation.isPending,
    isClosingGroup: closeGroupMutation.isPending,
    handleSubmit,
    handleToggleRole,
    handleTransfer,
    handleRemove,
    handleClose,
    hasActionError,
  }
}
