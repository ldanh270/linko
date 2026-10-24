"use client"

import type { InboxItemDto } from "@linko/contracts"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { useConversationPane } from "../hooks/useConversationPane"
import { ConversationHeader } from "./ConversationHeader"
import { MessageTimeline } from "./MessageTimeline"
import { MessageComposer } from "./MessageComposer"

/** One resolved accessible conversation supplies the shared timeline renderer. */
export interface ConversationPaneProps { readonly item: InboxItemDto }

/** Compose one conversation with isolated query states and no duplicate sidebar. UI only. */
export function ConversationPane({ item }: ConversationPaneProps) {
  const state = useConversationPane(item)
  return <div className="conversation-pane"><ConversationHeader header={state.header} />
    {state.query.isPending || state.profile.isPending ? <LoadingState label="Đang tải tin nhắn" /> : state.isIdentityUnavailable ? <ErrorState title="Không thể tải tài khoản" onRetry={() => void state.profile.refetch()} /> : state.isHistoryUnavailable ? <ErrorState title="Không thể tải cuộc trò chuyện" onRetry={() => void state.query.refetch()} /> : <MessageTimeline state={state} />}
    <MessageComposer state={state} />
  </div>
}
