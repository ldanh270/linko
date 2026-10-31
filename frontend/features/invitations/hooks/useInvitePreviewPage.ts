"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { ApiError } from "@/shared/http/ApiError"
import { previewInvitation, acceptInvitation } from "../api/invitations.api"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"

/**
 * Coordinate invitation preview fetching, acceptance mutations,
 * and authenticated redirect routes.
 *
 * @returns State and action handlers for InvitePreviewPage.
 */
export function useInvitePreviewPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params.token

  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewInvitation>> | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [hasError, setError] = useState(false)

  useEffect(() => {
    let isActive = true
    void previewInvitation(token)
      .then((result) => {
        if (isActive) setPreview(result)
      })
      .catch(() => {
        if (isActive) setError(true)
      })
      .finally(() => {
        if (isActive) setLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [token])

  const nextPath = buildAppRoute(APP_ROUTES.INVITATION, { token })

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: (group) =>
      router.replace(buildAppRoute(APP_ROUTES.GROUP_CONVERSATION, { conversationId: group.id })),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        router.replace(`${APP_ROUTES.LOGIN}?next=${encodeURIComponent(nextPath)}`)
      }
    },
  })

  return {
    preview,
    isLoading,
    hasError,
    nextPath,
    isAccepting: acceptMutation.isPending,
    hasAcceptError: acceptMutation.isError,
    handleAccept: () => acceptMutation.mutate(),
  }
}
