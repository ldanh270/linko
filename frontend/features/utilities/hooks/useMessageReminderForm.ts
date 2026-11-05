"use client"
import { useRef, type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { utilityApi } from "../api/utility.api"
import { localToInstant } from "../utility-time"
import { useUtilityAction } from "./useUtilityAction"
import type { ReminderDto } from "@linko/contracts"
import { instantToLocal } from "../utility-time"

/** Own a private message reminder without publishing reminder contents to the conversation. */
export function useMessageReminderForm(conversationId: string, messageId: string, onClose: () => void, reminder?: ReminderDto) {
  const requestId = useRef(crypto.randomUUID())
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const form = useForm({ defaultValues: { dueAt: reminder ? instantToLocal(reminder.dueAt, timezone) : "", note: reminder?.note ?? "" } })
  const mutation = useUtilityAction((values: { dueAt: string; note: string }) => {
    const fields = { dueAt: localToInstant(values.dueAt, timezone), note: values.note }
    return reminder ? utilityApi.editReminder(reminder.id, fields) : utilityApi.createReminder(conversationId, messageId, { ...fields, clientMessageId: requestId.current })
  }, onClose)
  return { ...form, submit: (event: FormEvent<HTMLFormElement>) => { void form.handleSubmit((values) => {
    try {
      if (Date.parse(localToInstant(values.dueAt, Intl.DateTimeFormat().resolvedOptions().timeZone)) <= Date.now()) { form.setError("dueAt", { message: "Chọn thời gian trong tương lai." }); return }
      if (!mutation.isPending) mutation.mutate(values)
    } catch { form.setError("dueAt", { message: "Thời gian không hợp lệ hoặc bị lặp do chuyển giờ mùa hè." }) }
  })(event) }, isPending: mutation.isPending, isError: mutation.isError }
}
