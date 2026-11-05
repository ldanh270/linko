"use client"
import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"
import type { MessageDto } from "@linko/contracts"
import { useQueryParamState } from "@/shared/url/useQueryParamState"
import { utilityApi } from "../api/utility.api"
import { UTILITY_UI } from "../utility.constants"
import { UTILITY_QUERY_PARTS } from "../utility-query.constants"

const focusSchema = z.string().regex(/^[a-f\d]{24}$/i).or(z.literal(""))
/** Load an older target's authorized neighborhood instead of pretending unloaded DOM can be scrolled. */
export function useMessageContext(conversationId: string, messages: readonly MessageDto[]) {
  const focus = useQueryParamState(UTILITY_UI.FOCUS, focusSchema, "")
  const query = useQuery({ queryKey: [UTILITY_QUERY_PARTS.CONTEXT, conversationId, focus.value], queryFn: () => utilityApi.context(conversationId, focus.value), enabled: Boolean(focus.value) })
  const combined = useMemo(() => {
    const unique = new Map([...messages, ...(query.isError ? [] : query.data ?? [])].map((message) => [message.id, message]))
    return [...unique.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
  }, [messages, query.data, query.isError])
  useEffect(() => {
    if (!focus.value || !combined.some((message) => message.id === focus.value)) return
    const timer = setTimeout(() => document.querySelector(`[data-message-id="${focus.value}"]`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" }), 100)
    return () => clearTimeout(timer)
  }, [focus.value, combined])
  return { messages: combined, focusedId: focus.value, query }
}
