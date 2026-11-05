"use client"
import { useRef, type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { UTILITY_LIMITS, type AppointmentDto } from "@linko/contracts"
import { utilityApi } from "../api/utility.api"
import { instantToLocal, localToInstant } from "../utility-time"
import { useUtilityAction } from "./useUtilityAction"
import { getUtilityTimezoneOptions } from "../utility-timezones"

const schema = z.object({ title: z.string().trim().min(1, "Nhập tiêu đề.").max(UTILITY_LIMITS.TITLE), description: z.string().max(UTILITY_LIMITS.DESCRIPTION), startsAt: z.string().min(1, "Chọn thời gian bắt đầu."), endsAt: z.string(), timezone: z.string().min(1), place: z.string().max(500), disambiguation: z.enum(["reject", "earlier", "later"]) })
type AppointmentValues = z.infer<typeof schema>
/** Own one-off appointment fields, timezone conversion and revision-safe edits. */
export function useAppointmentForm(conversationId: string, onClose: () => void, appointment?: AppointmentDto, sourceMessageId?: string) {
  const requestId = useRef(crypto.randomUUID())
  const timezone = appointment?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const form = useForm<AppointmentValues>({ resolver: zodResolver(schema), defaultValues: { title: appointment?.title ?? "", description: appointment?.description ?? "", startsAt: appointment ? instantToLocal(appointment.startsAt, timezone) : "", endsAt: appointment?.endsAt ? instantToLocal(appointment.endsAt, timezone) : "", timezone, place: appointment?.place ?? "", disambiguation: "reject" } })
  const mutation = useUtilityAction((values: AppointmentValues) => {
    const startsAt = localToInstant(values.startsAt, values.timezone, values.disambiguation)
    const endsAt = values.endsAt ? localToInstant(values.endsAt, values.timezone, values.disambiguation) : null
    if (Date.parse(startsAt) <= Date.now()) throw new Error("Chọn thời gian trong tương lai.")
    if (endsAt && endsAt <= startsAt) throw new Error("Thời gian kết thúc phải sau bắt đầu.")
    const body = { title: values.title, description: values.description, startsAt, endsAt, timezone: values.timezone, place: values.place }
    return appointment ? utilityApi.editAppointment(conversationId, appointment.id, { ...body, revision: appointment.revision }) : utilityApi.createAppointment(conversationId, { ...body, clientMessageId: requestId.current, ...(sourceMessageId ? { sourceMessageId } : {}) })
  }, onClose)
  const submit = (event: FormEvent<HTMLFormElement>) => { void form.handleSubmit((values) => {
    try {
      const start = localToInstant(values.startsAt, values.timezone, values.disambiguation)
      if (Date.parse(start) <= Date.now()) throw new Error("Chọn thời gian trong tương lai.")
      if (values.endsAt && localToInstant(values.endsAt, values.timezone, values.disambiguation) <= start) throw new Error("Thời gian kết thúc phải sau bắt đầu.")
      if (!mutation.isPending) mutation.mutate(values)
    } catch (error) { form.setError("startsAt", { message: error instanceof Error ? error.message : "Múi giờ không hợp lệ." }) }
  })(event) }
  return { ...form, submit, timezoneOptions: getUtilityTimezoneOptions(timezone), isPending: mutation.isPending, isError: mutation.isError }
}
