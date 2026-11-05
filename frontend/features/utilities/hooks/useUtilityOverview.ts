"use client"
import { useUtilityNow } from "./useUtilityNow"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { utilityApi } from "../api/utility.api"
import { UTILITY_UI } from "../utility.constants"

/** Load authorized utility lists for one conversation without fetching individual hidden resources. */
export function useUtilityOverview(conversationId: string) {
  const now = useUtilityNow()
  const [showMap, setShowMap] = useState(false)
  const polls = useQuery({ queryKey: [UTILITY_UI.QUERY, conversationId, "polls"], queryFn: () => utilityApi.polls(conversationId) })
  const appointments = useQuery({ queryKey: [UTILITY_UI.QUERY, conversationId, "appointments"], queryFn: () => utilityApi.appointments(conversationId) })
  const locations = useQuery({ queryKey: [UTILITY_UI.QUERY, conversationId, "locations"], queryFn: () => utilityApi.locations(conversationId), refetchInterval: 5000 })
  return { polls, appointments, locations, showMap, openMap: () => setShowMap(true), activeLocations: locations.data?.filter((share) => share.status === "active" && Date.parse(share.expiresAt) > now) ?? [] }
}
