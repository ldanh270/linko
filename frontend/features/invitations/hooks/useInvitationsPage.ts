"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { issueInvitation, listInvitations, revokeInvitation } from "../api/invitations.api"

/**
 * Coordinate group invitation issuance, listing, revocation, and clipboard copying.
 * Isolates side-effects and asynchronous mutation logic from presentation components.
 *
 * @returns State and action handlers for InvitationsPage.
 */
export function useInvitationsPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const queryClient = useQueryClient()

  const [issuedUrl, setIssuedUrl] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const queryKey = ["invitations", conversationId] as const

  const query = useQuery({
    queryKey,
    queryFn: () => listInvitations(conversationId),
  })

  const issueMutation = useMutation({
    mutationFn: () => issueInvitation(conversationId, crypto.randomUUID()),
    onSuccess: async (result) => {
      setIssuedUrl(result.url)
      await queryClient.invalidateQueries({ queryKey })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeInvitation(conversationId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const handleIssue = () => {
    setFeedback(null)
    issueMutation.mutate()
  }

  const handleCopy = async () => {
    if (!issuedUrl) return
    try {
      await navigator.clipboard.writeText(issuedUrl)
      setFeedback("Đã sao chép liên kết vào bộ nhớ tạm.")
    } catch {
      setFeedback("Không thể sao chép. Hãy chọn và sao chép liên kết thủ công.")
    }
  }

  const handleRevoke = (invitationId: string) => {
    if (window.confirm("Thu hồi liên kết này? Người khác sẽ không thể tham gia bằng liên kết.")) {
      revokeMutation.mutate(invitationId)
    }
  }

  return {
    conversationId,
    query,
    invitations: query.data ?? [],
    issuedUrl,
    feedback,
    isIssuing: issueMutation.isPending,
    isRevoking: revokeMutation.isPending,
    hasIssueError: issueMutation.isError,
    hasRevokeError: revokeMutation.isError,
    handleIssue,
    handleCopy,
    handleRevoke,
  }
}
