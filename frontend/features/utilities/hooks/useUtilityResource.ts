"use client"
import { useQuery } from "@tanstack/react-query"
import { UTILITY_UI } from "../utility.constants"

/** Fetch a conversation collection once for all mounted cards, falling back for older unloaded resources. */
export function useUtilityResource<T extends { readonly id: string }>(options: { readonly conversationId: string; readonly resourceId: string; readonly collection: string; readonly list: () => Promise<T[]>; readonly get: () => Promise<T>; readonly refetchInterval?: number }) {
  const list = useQuery({ queryKey: [UTILITY_UI.QUERY, options.conversationId, options.collection], queryFn: options.list, refetchInterval: options.refetchInterval })
  const match = list.data?.find((item) => item.id === options.resourceId)
  const individual = useQuery({ queryKey: [UTILITY_UI.QUERY, options.conversationId, options.collection, options.resourceId], queryFn: options.get, enabled: list.isSuccess && !match, refetchInterval: options.refetchInterval })
  const query = match || !list.isSuccess ? list : individual
  return { data: query.isError ? undefined : match ?? individual.data, isError: query.isError, isPending: query.isPending, refetch: async () => { await list.refetch(); if (!match) await individual.refetch() } }
}
