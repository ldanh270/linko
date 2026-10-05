"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { listPins, pinMessage, unpinMessage } from "@/features/groups/api/pins.api"

/** Read and update a group's limited pinned-message collection. */
export function useGroupPins(conversationId: string, enabled: boolean) {
  const client = useQueryClient()
  const queryKey = ["pins", conversationId] as const
  const query = useQuery({ queryKey, queryFn: () => listPins(conversationId), enabled })
  const update = useMutation({
    mutationFn: (input: { readonly messageId: string; readonly isPinned: boolean }) => input.isPinned
      ? unpinMessage({ conversationId, messageId: input.messageId }, client)
      : pinMessage({ conversationId, messageId: input.messageId }, client),
    onSuccess: (pins) => client.setQueryData(queryKey, pins),
  })
  return { query, update }
}
