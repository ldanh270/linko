"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getMine, updateMine } from "../api/profile.api"
import { getSessionGeneration } from "@/features/auth/api/auth.api"

const PROFILE_QUERY_KEY = ["profile", "mine"] as const

/** Load and update the signed-in profile with cache synchronization. */
export function useProfilePage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: getMine })
  const update = useMutation({
    mutationFn: updateMine,
    onMutate: () => getSessionGeneration(),
    onSuccess: (profile, _input, generation) => {
      if (generation === getSessionGeneration()) queryClient.setQueryData(PROFILE_QUERY_KEY, profile)
    },
  })
  return { query, update }
}
