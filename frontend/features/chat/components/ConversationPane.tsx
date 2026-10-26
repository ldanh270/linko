"use client"

import type { InboxItemDto } from "@linko/contracts"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { useConversationPane } from "../hooks/useConversationPane"
import { ConversationHeader } from "./ConversationHeader"
import { ConversationSearchBar } from "./ConversationSearchBar"
import { MessageTimeline } from "./MessageTimeline"
import { MessageComposer } from "./MessageComposer"
import { ConversationDetailsSheet } from "./details/ConversationDetailsSheet"

/** One resolved accessible conversation supplies the shared timeline renderer. */
export interface ConversationPaneProps { readonly item: InboxItemDto }

/** Compose one conversation with isolated query states and Messenger-style details sheet. UI only. */
export function ConversationPane({ item }: ConversationPaneProps) {
  const state = useConversationPane(item)
  return (
    <div className={`conversation-layout ${state.details.isOpen ? "has-details" : ""}`}>
      <div className="conversation-pane">
        <ConversationHeader header={state.header} />
        {state.searchState.isOpen && (
          <ConversationSearchBar
            query={state.searchState.query}
            onChange={state.searchState.onChange}
            matches={state.searchState.matches}
            activeIndex={state.searchState.activeIndex}
            onNext={state.searchState.onNext}
            onPrev={state.searchState.onPrev}
            onSelectMatch={state.searchState.onSelectMatch}
            onClose={state.searchState.onClose}
            hasMoreHistory={state.searchState.hasMoreHistory}
            isLoadingMore={state.searchState.isLoadingMore}
            onLoadMoreHistory={state.searchState.onLoadMoreHistory}
          />
        )}
        {state.query.isPending || state.profile.isPending ? (
          <LoadingState label="Đang tải tin nhắn" />
        ) : state.isIdentityUnavailable ? (
          <ErrorState title="Không thể tải tài khoản" onRetry={() => void state.profile.refetch()} />
        ) : state.isHistoryUnavailable ? (
          <ErrorState title="Không thể tải cuộc trò chuyện" onRetry={() => void state.query.refetch()} />
        ) : (
          <MessageTimeline state={state} />
        )}
        <MessageComposer state={state} />
      </div>
      {state.details.isOpen && (
        <ConversationDetailsSheet details={state.details} onClose={state.details.onClose} />
      )}
    </div>
  )
}
