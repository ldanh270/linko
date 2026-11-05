"use client"
import { useState } from "react"
import { useUtilityResource } from "./useUtilityResource"
import type { AppointmentRsvpRequest } from "@linko/contracts"
import { utilityApi } from "../api/utility.api"
import { useUtilityNow } from "./useUtilityNow"
import { REMINDER_OFFSETS } from "@linko/contracts"
import { useUtilityAction } from "./useUtilityAction"

/** Own response/reminder selections and permission-aware appointment actions. */
export function useAppointmentCard(conversationId: string, resourceId: string) {
  const query = useUtilityResource({ conversationId, resourceId, collection: "appointments", list: () => utilityApi.appointments(conversationId), get: () => utilityApi.appointment(conversationId, resourceId) })
  const now = useUtilityNow()
  const reminderOptions = REMINDER_OFFSETS.map((minutes) => ({ minutes, disabled: !query.data || Date.parse(query.data.startsAt) - minutes * 60000 <= now }))
  const [isEditing, setEditing] = useState(false)
  const [response, setResponse] = useState<AppointmentRsvpRequest["status"] | null>(null)
  const [reminder, setReminder] = useState<string | null>(null)
  const status = response ?? query.data?.myResponse ?? "going"
  const reminderMinutes = reminder ?? (query.data?.reminderMinutes == null ? "none" : String(query.data.reminderMinutes))
  const mutation = useUtilityAction((action: "rsvp" | "cancel") => action === "cancel" ? utilityApi.cancelAppointment(conversationId, resourceId) : utilityApi.rsvp(conversationId, resourceId, { status, reminderMinutes: status === "declined" || reminderMinutes === "none" ? null : Number(reminderMinutes) }))
  const cancel = () => { if (window.confirm("Hủy lịch hẹn và những lời nhắc chưa gửi?")) mutation.mutate("cancel") }
  return { query, reminderOptions, isEditing, edit: () => setEditing(true), closeEdit: () => setEditing(false), status, reminderMinutes, setResponse, setReminder, submit: () => mutation.mutate("rsvp"), cancel, isPending: mutation.isPending, isError: mutation.isError }
}
