"use client"

import { useQuery } from "@tanstack/react-query"
import { getMine } from "../api/profile.api"
import { PROFILE_QUERY_KEY } from "../profile.constants"

/** Share the authenticated identity without starting a second session bootstrap. */
export function useCurrentProfile() {
  return useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: getMine, staleTime: 30_000 })
}
