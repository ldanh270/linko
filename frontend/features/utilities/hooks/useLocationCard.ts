"use client"
import { useEffect, useMemo, useState } from "react"
import { useUtilityResource } from "./useUtilityResource"
import { UTILITY_LIMITS } from "@linko/contracts"
import { utilityApi } from "../api/utility.api"
import { getLocationPublisher } from "../location-publisher"
import { useUtilityAction } from "./useUtilityAction"
import { useLocationConnectivity } from "./useLocationConnectivity"

/** Refetch authorized fixes and derive honest freshness/expiry independently of map availability. */
export function useLocationCard(conversationId: string, resourceId: string) {
  const query = useUtilityResource({ conversationId, resourceId, collection: "locations", list: () => utilityApi.locations(conversationId), get: () => utilityApi.location(conversationId, resourceId), refetchInterval: 5000 })
  const [now, setNow] = useState(Date.now)
  const [showMap, setShowMap] = useState(false)
  const connected = useLocationConnectivity()
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const ended = query.data?.status === "ended" || Boolean(query.data && Date.parse(query.data.expiresAt) <= now)
  useEffect(() => { if (ended) getLocationPublisher().forget(resourceId) }, [ended, resourceId])
  const stale = !connected || !query.data?.position || query.data.isStale || now - Date.parse(query.data.position.updatedAt) > UTILITY_LIMITS.LOCATION_STALE_MS
  const mutation = useUtilityAction(async () => {
    const result = await utilityApi.stopLocation(conversationId, resourceId)
    await getLocationPublisher().stop(resourceId)
    return result
  })
  const shares = useMemo(() => !ended && query.data ? [query.data] : [], [ended, query.data])
  return { query, ended, stale, shares, showMap, openMap: () => setShowMap(true), stop: () => mutation.mutate(), isPending: mutation.isPending, remainingMinutes: query.data ? Math.max(0, Math.ceil((Date.parse(query.data.expiresAt) - now) / 60000)) : 0 }
}
