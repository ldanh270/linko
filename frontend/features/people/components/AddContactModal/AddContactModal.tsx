import { Modal } from "@/shared/components/Modal/Modal"
import { SearchInput } from "@/shared/components/SearchInput"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import type { usePeoplePage } from "../../hooks/usePeoplePage"
import { PEOPLE_LIMITS } from "../../people.constants"
import { FriendRequests } from "../FriendRequests"
import { SearchPersonRow } from "../SearchPersonRow"

/** Shared page-owned contact dialog state. */
export interface AddContactModalProps { readonly state: ReturnType<typeof usePeoplePage> }

/** Render friend requests and public contact search without removing existing features. UI only. */
export function AddContactModal({ state }: AddContactModalProps) {
  return <Modal title="Thêm bạn bè" onClose={state.onCloseAdd}><FriendRequests state={state} /><h3 className="mb-4 font-semibold">Tìm người dùng</h3>
    <SearchInput label="Tên hoặc tên đăng nhập" value={state.keyword} stateKey={state.keywordRevision} onChange={state.onKeywordChange} />
    {state.keyword.trim().length < PEOPLE_LIMITS.MIN_SEARCH_LENGTH ? <p className="quiet-copy">Nhập ít nhất 2 ký tự để tìm kiếm.</p> : state.results.isPending ? <LoadingState label="Đang tìm kiếm" /> : state.results.isError ? <ErrorState title="Không thể tìm người dùng" onRetry={state.onRetrySearch} /> : state.searchRows.length ? <ul>{state.searchRows.map((person) => <SearchPersonRow key={person.id} person={person} isPending={state.actions.request.isPending} />)}</ul> : <EmptyState title="Không tìm thấy ai" />}
  </Modal>
}
