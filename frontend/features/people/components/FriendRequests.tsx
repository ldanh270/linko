import { ErrorState } from "@/shared/components/ErrorState"
import { LoadingState } from "@/shared/components/LoadingState"
import type { usePeoplePage } from "../hooks/usePeoplePage"
import { FriendRequestRow } from "./FriendRequestRow"

/** Request state is supplied by the page hook to avoid duplicate fetching. */
export interface FriendRequestsProps { readonly state: ReturnType<typeof usePeoplePage> }

/** Render the incoming request section inside the contact dialog. UI only. */
export function FriendRequests({ state }: FriendRequestsProps) {
  return <section className="mb-5"><h3 className="font-semibold">Lời mời kết bạn</h3>{state.requests.isPending ? <LoadingState label="Đang tải lời mời" /> : state.requests.isError ? <ErrorState title="Không thể tải lời mời" onRetry={() => void state.requests.refetch()} /> : state.requestRows.length ? <ul>{state.requestRows.map((request) => <FriendRequestRow key={request.id} request={request} isPending={state.actions.accept.isPending || state.actions.decline.isPending} />)}</ul> : <p className="quiet-copy mt-2">Không có lời mời mới.</p>}</section>
}
