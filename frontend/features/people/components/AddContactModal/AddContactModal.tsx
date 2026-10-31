import { Modal } from "@/shared/components/Modal/Modal"
import { SearchInput } from "@/shared/components/SearchInput"
import { Skeleton } from "@/shared/components/Skeleton"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import type { usePeoplePage } from "../../hooks/usePeoplePage"
import type { useAddContactModal } from "../../hooks/useAddContactModal"
import { PEOPLE_LIMITS } from "../../people.constants"
import { FriendRequests } from "../FriendRequests"
import { SearchPersonRow } from "../SearchPersonRow"

/** Shared contact dialog state satisfied by either usePeoplePage or useAddContactModal. */
export interface AddContactModalProps {
  readonly state: ReturnType<typeof usePeoplePage> | ReturnType<typeof useAddContactModal>
}

/** Render friend requests and public contact search without removing existing features. UI only. */
export function AddContactModal({ state }: AddContactModalProps) {
  return <Modal title="Thêm bạn bè" onClose={state.onCloseAdd}><FriendRequests state={state} /><h3 className="mb-4 font-semibold">Tìm người dùng</h3>
    <SearchInput label="Tên hoặc tên đăng nhập" value={state.keyword} stateKey={String(state.keywordRevision)} onChange={state.onKeywordChange} />
    {state.keyword.trim().length < PEOPLE_LIMITS.MIN_SEARCH_LENGTH ? (
      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">Nhập ít nhất 2 ký tự để tìm kiếm.</p>
    ) : state.results.isPending ? (
      <div className="space-y-3 my-3" role="status" aria-label="Đang tìm kiếm">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-[var(--border)]">
            <Skeleton circle className="w-10 h-10 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-28 rounded-xs" />
              <Skeleton className="h-3 w-16 rounded-xs" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
        <span className="sr-only">Đang tìm kiếm</span>
      </div>
    ) : state.results.isError ? (
      <ErrorState title="Không thể tìm người dùng" onRetry={state.onRetrySearch} />
    ) : state.searchRows.length ? (
      <ul>{state.searchRows.map((person) => <SearchPersonRow key={person.id} person={person} isPending={state.actions.request.isPending} />)}</ul>
    ) : (
      <EmptyState title="Không tìm thấy ai" />
    )}
  </Modal>
}
