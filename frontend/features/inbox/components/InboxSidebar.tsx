"use client"

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
import { useInboxPage } from "../hooks/useInboxPage"
import { ConversationList } from "./ConversationList"
import { RecentPeopleStrip } from "./RecentPeopleStrip"

/** Render the Chats reference panel using real inbox data and URL filters. UI only. */
export function InboxSidebar() {
  const state = useInboxPage()
  return (
    <SidebarPanel
      header={
        <SidebarHeader
          title="Tin nhắn"
          action={
            <div className="sidebar-header-actions">
              <Link href={APP_ROUTES.GROUP_CREATE} aria-label="Tạo nhóm" className="sidebar-header-action">
                <Icon name={ICON_NAMES.GROUP} />
              </Link>
              <Link href={APP_ROUTES.PEOPLE} aria-label="Tìm bạn bè" className="sidebar-header-action">
                <Icon name={ICON_NAMES.ADD_CONTACT} />
              </Link>
            </div>
          }
        />
      }
    >
      <SearchInput
        label="Tìm hội thoại đã tải"
        placeholder="Tìm tin nhắn hoặc người dùng"
        value={state.search}
        stateKey={state.searchRevision}
        onChange={state.onSearchChange}
      />
      {state.people.length > 0 && <RecentPeopleStrip people={state.people} isOnline={state.isOnline} />}
      <h2 className="sidebar-section-label">Gần đây</h2>
      <nav aria-label="Lọc hội thoại" className="sidebar-filters">
        {state.filters.map((filter) => (
          <Button key={filter.value} variant="ghost" aria-pressed={filter.isActive} onClick={filter.onSelect}>
            {filter.label}
          </Button>
        ))}
      </nav>
      {state.query.isPending ? (
        <LoadingState label="Đang tải hội thoại" />
      ) : state.query.isError ? (
        <ErrorState title="Không thể tải hộp thư" onRetry={state.onRetry} />
      ) : state.rows.length === 0 ? (
        <EmptyState title="Chưa có cuộc trò chuyện" description="Kết nối với bạn bè hoặc tạo nhóm để bắt đầu." />
      ) : (
        <ConversationList
          rows={state.rows}
          activeConversationId={state.conversationId}
          isOnline={state.isOnline}
        />
      )}
      {state.search && <p className="sidebar-footnote">Tìm trong các hội thoại ở trang đã tải.</p>}
      {state.query.data?.nextCursor && (
        <Button className="m-4" variant="ghost" onClick={state.onLoadMore} isLoading={state.query.isFetching}>
          Trang tiếp theo
        </Button>
      )}
    </SidebarPanel>
  )
}
