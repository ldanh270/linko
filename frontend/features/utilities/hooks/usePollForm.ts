"use client"
import { useRef } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { POLL_MODE, UTILITY_LIMITS } from "@linko/contracts"
import { utilityApi } from "../api/utility.api"
import { useUtilityAction } from "./useUtilityAction"
import { localToInstant } from "../utility-time"

const schema = z.object({ question: z.string().trim().min(1, "Nhập câu hỏi.").max(UTILITY_LIMITS.QUESTION), options: z.array(z.object({ text: z.string().trim().min(1, "Nhập phương án.").max(UTILITY_LIMITS.OPTION) })).min(UTILITY_LIMITS.MIN_OPTIONS).max(UTILITY_LIMITS.MAX_OPTIONS).refine((options) => new Set(options.map((option) => option.text.toLowerCase())).size === options.length, "Các phương án phải khác nhau."), mode: z.enum([POLL_MODE.SINGLE, POLL_MODE.MULTIPLE]), closesAt: z.string() })
type PollFormValues = z.infer<typeof schema>
/** Own poll validation, stable request identity and a dynamic option list. */
export function usePollForm(conversationId: string, onClose: () => void) {
  const requestId = useRef(crypto.randomUUID())
  const form = useForm<PollFormValues>({ resolver: zodResolver(schema), defaultValues: { question: "", options: [{ text: "" }, { text: "" }], mode: POLL_MODE.SINGLE, closesAt: "" } })
  const fields = useFieldArray({ control: form.control, name: "options" })
  const mutation = useUtilityAction((values: PollFormValues) => {
    const closesAt = values.closesAt ? localToInstant(values.closesAt, Intl.DateTimeFormat().resolvedOptions().timeZone) : null
    if (closesAt && Date.parse(closesAt) <= Date.now()) throw new Error("Future deadline required")
    return utilityApi.createPoll(conversationId, { clientMessageId: requestId.current, question: values.question, options: values.options.map((option) => option.text), mode: values.mode, closesAt })
  }, onClose)
  return { ...form, fields: fields.fields, add: () => fields.append({ text: "" }), remove: fields.remove, submit: form.handleSubmit((values) => { if (!mutation.isPending) mutation.mutate(values) }), isPending: mutation.isPending, isError: mutation.isError }
}
