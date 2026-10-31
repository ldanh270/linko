"use client"

import { CONVERSATION_KIND } from "@linko/contracts"
import { SidebarPanel } from "@/shared/layout/SidebarPanel"
import { SidebarHeader } from "@/shared/layout/SidebarHeader"
import { SearchInput } from "@/shared/components/SearchInput"
import { Link } from "@/shared/components/Link"
import { Button } from "@/shared/components/Button"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { useInboxPage } from "@/features/inbox/hooks/useInboxPage"
import { GroupListRow } from "./GroupListRow"

/** Render the Groups reference panel while retaining the existing group-creation route. UI only. */
export function GroupsSidebar() {
  const state = useInboxPage(CONVERSATION_KIND.GROUP)
  return (
    <SidebarPanel
      header={
        <SidebarHeader
          title="Nhóm"
          action={
            <Link
              href={APP_ROUTES.GROUP_CREATE}
              aria-label="Tạo nhóm"
              className="grid place-items-center w-9 h-9 rounded-full text-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
            >
              <Icon name={ICON_NAMES.GROUP} />
            </Link>
          }
        />
      }
    >
      <SearchInput
        label="Tìm nhóm đã tải"
        placeholder="Tìm nhóm"
        value={state.search}
        stateKey={state.searchRevision}
        onChange={state.onSearchChange}
        className="mx-6 mb-4"
      />
      {state.query.isPending ? (
        <LoadingState label="Đang tải nhóm" />
      ) : state.query.isError ? (
        <ErrorState title="Không thể tải nhóm" onRetry={state.onRetry} />
      ) : state.rows.length ? (
        <ul>{state.rows.map((group) => <GroupListRow key={group.id} group={group} />)}</ul>
      ) : (
        <EmptyState title="Chưa có nhóm nào" action={<Link href={APP_ROUTES.GROUP_CREATE}>Tạo nhóm đầu tiên</Link>} />
      )}
      {state.search && <p className="px-6 py-3 text-xs text-[var(--text-secondary)]">Tìm trong các nhóm ở trang đã tải.</p>}
      {state.query.data?.nextCursor && (
        <Button className="m-4" variant="ghost" onClick={state.onLoadMore} isLoading={state.query.isFetching}>
          Trang tiếp theo
        </Button>
      )}
    </SidebarPanel>
  )
}
