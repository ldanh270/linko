"use client"

import type { InboxItemDto } from "@linko/contracts"
import { MessageTimelineSkeleton } from "@/shared/components/Skeleton"
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
    <div className="relative flex h-full w-full min-h-0 overflow-hidden">
      {/* Primary chat column */}
      <div className="flex flex-1 min-w-0 flex-col h-full min-h-0 bg-surface">
        {/* Conversation header */}
        <ConversationHeader header={state.header} />

        {/* In-chat message search bar */}
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

        {/* Message timeline with loading & error fallbacks */}
        {state.query.isPending || state.profile.isPending ? (
          <MessageTimelineSkeleton />
        ) : state.isIdentityUnavailable ? (
          <ErrorState title="Không thể tải tài khoản" onRetry={() => void state.profile.refetch()} />
        ) : state.isHistoryUnavailable ? (
          <ErrorState title="Không thể tải cuộc trò chuyện" onRetry={() => void state.query.refetch()} />
        ) : (
          <MessageTimeline state={state} />
        )}

        {/* Message composer */}
        <MessageComposer state={state} />
      </div>

      {/* Slide-over conversation details sheet */}
      {state.details.isOpen && (
        <ConversationDetailsSheet details={state.details} onClose={state.details.onClose} />
      )}
    </div>
  )
}
