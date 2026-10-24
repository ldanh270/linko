"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateMine, type UpdateMineInput } from "../api/profile.api"
import { getSessionGeneration } from "@/features/auth/api/auth.api"
import { useCurrentProfile } from "./useCurrentProfile"
import { PROFILE_QUERY_KEY } from "../profile.constants"
import { mapProfileDetails } from "../profile.mapper"

/** Load and update account details with session-safe shared cache synchronization. */
export function useProfilePage() {
  const client = useQueryClient()
  const query = useCurrentProfile()
  const update = useMutation({ mutationFn: updateMine, onMutate: getSessionGeneration,
    onSuccess: (profile, _input, generation) => { if (generation === getSessionGeneration()) client.setQueryData(PROFILE_QUERY_KEY, profile) },
  })
  return { query, update, details: query.data ? mapProfileDetails(query.data) : [], onSave: (input: UpdateMineInput) => update.mutate(input), onRetry: () => void query.refetch() }
}
