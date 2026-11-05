"use client"
import type { ComponentType } from "react"
import { CHAT_MESSAGE_KIND, type ChatMessageKind } from "@linko/contracts"
import { PollCard } from "./PollCard"
import { AppointmentCard } from "./AppointmentCard"
import { LocationCard } from "./LocationCard"

/** Typed message reference prepared by the timeline mapper. */
export interface UtilityMessageCardProps { readonly kind: ChatMessageKind; readonly resourceId: string; readonly conversationId: string }
const renderers: Partial<Record<ChatMessageKind, ComponentType<{ conversationId: string; resourceId: string }>>> = { [CHAT_MESSAGE_KIND.POLL]: PollCard, [CHAT_MESSAGE_KIND.APPOINTMENT]: AppointmentCard, [CHAT_MESSAGE_KIND.LOCATION]: LocationCard }
/** Dispatch first-class utility messages through a single renderer registry. UI only. */
export function UtilityMessageCard({ kind, resourceId, conversationId }: UtilityMessageCardProps) {
  const Card = renderers[kind]
  return Card ? <div className="min-w-0 w-[min(320px,100%)]"><Card conversationId={conversationId} resourceId={resourceId} /></div> : <p className="text-sm">Loại nội dung này chưa được hỗ trợ.</p>
}
