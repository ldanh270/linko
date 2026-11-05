"use client"
import { useState } from "react"
import { useUtilityResource } from "./useUtilityResource"
import { POLL_MODE } from "@linko/contracts"
import { utilityApi } from "../api/utility.api"
import { useUtilityAction } from "./useUtilityAction"

/** Own authorized poll data and one atomic complete selection per submission. */
export function usePollCard(conversationId: string, resourceId: string) {
  const query = useUtilityResource({ conversationId, resourceId, collection: "polls", list: () => utilityApi.polls(conversationId), get: () => utilityApi.poll(conversationId, resourceId), refetchInterval: 15000 })
  const [draft, setDraft] = useState<readonly string[] | null>(null)
  const selected = draft ?? query.data?.selectedOptionIds ?? []
  const mutation = useUtilityAction((action: "vote" | "withdraw" | "close") => action === "close" ? utilityApi.closePoll(conversationId, resourceId) : action === "withdraw" ? utilityApi.withdraw(conversationId, resourceId) : utilityApi.vote(conversationId, resourceId, selected), () => setDraft(null))
  const choose = (id: string) => setDraft(query.data?.mode === POLL_MODE.SINGLE ? [id] : selected.includes(id) ? selected.filter((option) => option !== id) : [...selected, id])
  const close = () => { if (window.confirm("Đóng bình chọn? Thành viên sẽ không thể đổi phiếu.")) mutation.mutate("close") }
  return { query, selected, choose, vote: () => mutation.mutate("vote"), withdraw: () => mutation.mutate("withdraw"), close, isPending: mutation.isPending, isError: mutation.isError }
}
