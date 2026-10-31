import { ErrorState } from "@/shared/components/ErrorState"
import { FriendRequestsSkeleton } from "@/shared/components/Skeleton"
import { FriendRequestRow, type FriendRequestRowProps } from "./FriendRequestRow"
export interface FriendRequestsState {
  readonly requests: {
    readonly isPending: boolean
    readonly isError: boolean
    readonly refetch: () => void | Promise<unknown>
  }
  readonly requestRows: readonly FriendRequestRowProps["request"][]
  readonly actions: {
    readonly accept: { readonly isPending: boolean }
    readonly decline: { readonly isPending: boolean }
  }
}

/** Request state is supplied by the page hook to avoid duplicate fetching. */
export interface FriendRequestsProps { readonly state: FriendRequestsState }

/** Render the incoming request section inside the contact dialog. UI only. */
export function FriendRequests({ state }: FriendRequestsProps) {
  return (
    <section className="mb-5">
      <h3 className="font-semibold">Lời mời kết bạn</h3>
      {state.requests.isPending ? (
        <FriendRequestsSkeleton />
      ) : state.requests.isError ? (
        <ErrorState title="Không thể tải lời mời" onRetry={() => void state.requests.refetch()} />
      ) : state.requestRows.length ? (
        <ul>
          {state.requestRows.map((request) => (
            <FriendRequestRow
              key={request.id}
              request={request}
              isPending={state.actions.accept.isPending || state.actions.decline.isPending}
            />
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-text-secondary leading-relaxed mt-2">Không có lời mời mới.</p>
      )}
    </section>
  )
}
