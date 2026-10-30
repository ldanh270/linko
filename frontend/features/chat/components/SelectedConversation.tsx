"use client"

import { useSelectedConversation } from "@/features/inbox/hooks/useSelectedConversation"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { ConversationEmptyState } from "./ConversationEmptyState"
import { ConversationPane } from "./ConversationPane"

/** Resolve the URL's accessible conversation independently of sidebar query states. UI only. */
export function SelectedConversation() {
  const { conversationId, isConversationView, query } = useSelectedConversation()
  if (!conversationId) return isConversationView ? <ErrorState title="Cuộc trò chuyện không hợp lệ" /> : <ConversationEmptyState />
  if (query.isPending) return <LoadingState label="Đang mở cuộc trò chuyện" />
  if (query.isError) return <ErrorState title="Không thể mở cuộc trò chuyện" onRetry={() => void query.refetch()} />
  if (!query.data) return <ErrorState title="Cuộc trò chuyện không còn khả dụng" onRetry={() => void query.refetch()} />
  return <ConversationPane key={conversationId} item={query.data} />
}
