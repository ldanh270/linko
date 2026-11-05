"use client"
import { useRouter } from "next/navigation"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import type { ReminderDto } from "@linko/contracts"
import { resolveNotificationRoute } from "@/features/notifications/api/notificationRoute"
import { utilityApi } from "../api/utility.api"
import { UTILITY_UI } from "../utility.constants"
import { useUtilityAction } from "./useUtilityAction"
import { formatUtilityTime } from "../utility-time"
import { useUtilityNow } from "./useUtilityNow"
import { UTILITY_QUERY_PARTS } from "../utility-query.constants"

/** Own private reminder read/dismiss actions and authorized navigation to the source message. */
export function useReminderInbox(onClose: () => void) {
  const client = useQueryClient()
  const router = useRouter()
  const now = useUtilityNow()
  const [editing, setEditing] = useState<ReminderDto | null>(null)
  const query = useInfiniteQuery({ queryKey: [UTILITY_UI.REMINDERS, UTILITY_QUERY_PARTS.PAGES], initialPageParam: undefined as string | undefined, queryFn: ({ pageParam }) => utilityApi.reminderInbox(pageParam), getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined })
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const rows = items.map((item) => ({ item, isEditable: !item.deliveredAt && !item.appointmentId, time: formatUtilityTime(item.dueAt), status: item.deliveredAt ? Date.parse(item.deliveredAt) - Date.parse(item.dueAt) > 60000 ? "Đã nhắc bù" : "Đã nhắc" : Date.parse(item.dueAt) < now ? "Đang chờ nhắc bù" : "Sắp nhắc" }))
  const action = useUtilityAction(async (input: { action: "dismiss" | "read" | "all"; item?: ReminderDto }) => {
    if (input.action === "all") return utilityApi.readAll()
    if (!input.item) return
    if (input.action === "dismiss") return utilityApi.dismissReminder(input.item.id)
    await utilityApi.readReminder(input.item.id)
    const route = await resolveNotificationRoute(client, input.item.conversationId)
    onClose()
    router.push(`${route}${route.includes("?") ? "&" : "?"}${UTILITY_UI.FOCUS}=${encodeURIComponent(input.item.messageId)}`)
  })
  const dismiss = (item: ReminderDto) => { if (window.confirm("Xóa lời nhắc này khỏi hộp nhắc lịch?")) action.mutate({ action: "dismiss", item }) }
  return { query, rows, editing, edit: setEditing, closeEdit: () => setEditing(null), loadMore: () => { void query.fetchNextPage() }, open: (item: ReminderDto) => action.mutate({ action: "read", item }), dismiss, readAll: () => action.mutate({ action: "all" }), isPending: action.isPending }
}
