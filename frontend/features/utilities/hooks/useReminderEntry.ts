"use client"
import { useQuery } from "@tanstack/react-query"
import { utilityApi } from "../api/utility.api"
import { UTILITY_UI } from "../utility.constants"
import { useUtilityPanel } from "./useUtilityPanel"
import { UTILITY_QUERY_PARTS } from "../utility-query.constants"

/** Prepare the shared private reminder destination and its unread badge. */
export function useReminderEntry() {
  const panel = useUtilityPanel()
  const query = useQuery({ queryKey: [UTILITY_UI.REMINDERS, UTILITY_QUERY_PARTS.SUMMARY], queryFn: () => utilityApi.reminderInbox() })
  return { unread: query.data?.unreadCount ?? 0, open: () => panel.open("reminders") }
}
