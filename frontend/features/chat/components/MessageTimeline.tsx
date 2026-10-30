"use client"

import { Button } from "@/shared/components/Button"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import type { useConversationPane } from "../hooks/useConversationPane"
import { useMessageTimeline } from "../hooks/useMessageTimeline"
import { MessageBubble } from "./MessageBubble"
import { TypingBubble } from "./TypingBubble"

/** Query/row state prepared by the feature hook. */
export interface MessageTimelineProps { readonly state: ReturnType<typeof useConversationPane> }

/** Render the independent scrolling history region and its pagination states. UI only. */
export function MessageTimeline({ state }: MessageTimelineProps) {
  const { timelineRef, onLoadOlder } = useMessageTimeline(state.rows, state.query.fetchNextPage, state.conversationId)
  return <div className="timeline" ref={timelineRef} aria-label="Tin nhắn" role="log" aria-live="polite">
    {state.query.isFetchNextPageError && <ErrorState title="Không thể tải tin cũ hơn" onRetry={onLoadOlder} />}
    {state.query.hasNextPage && <Button className="mb-5 w-full" variant="ghost" isLoading={state.query.isFetchingNextPage} onClick={onLoadOlder}>Tải tin cũ hơn</Button>}
    {state.rows.length === 0 && <EmptyState title={state.header.search ? "Không tìm thấy tin nhắn đã tải" : "Chưa có tin nhắn"} description="Bắt đầu cuộc trò chuyện bằng tin nhắn đầu tiên." />}
    {state.rows.map((message) => <MessageBubble key={message.id} message={message} />)}
    {Boolean(state.typingNames) && <TypingBubble names={state.typingNames} />}
  </div>
}
