"use client"

import { SidebarHeader } from "@/shared/layout/SidebarHeader"
import { SidebarPanel } from "@/shared/layout/SidebarPanel"
import { SearchInput } from "@/shared/components/SearchInput"
import { IconButton } from "@/shared/components/IconButton"
import { Button } from "@/shared/components/Button"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { usePeoplePage } from "../hooks/usePeoplePage"
import { ContactGroup } from "./ContactGroup"
import { AddContactModal } from "./AddContactModal/AddContactModal"
import { PersonProfilePanel } from "./PersonProfilePanel"

/** Render the alphabetical Contacts reference and preserve real friend actions. UI only. */
export function ContactsSidebar() {
  const state = usePeoplePage()
  return <SidebarPanel header={<SidebarHeader title="Danh bạ" action={<IconButton label="Thêm bạn bè" icon={<Icon name={ICON_NAMES.ADD_CONTACT} />} onClick={state.onOpenAdd} />} />}>
    <SearchInput label="Tìm trong danh bạ" placeholder="Tìm người dùng..." value={state.search} stateKey={state.searchRevision} onChange={state.onSearchChange} />
    {state.requestRows.length > 0 && <Button className="mx-6 mb-4" variant="ghost" onClick={state.onOpenAdd}>Lời mời kết bạn ({state.requestRows.length})</Button>}
    {state.friends.isPending ? <LoadingState label="Đang tải danh bạ" /> : state.friends.isError ? <ErrorState title="Không thể tải danh bạ" onRetry={state.onRetry} /> : state.groups.length ? state.groups.map((group) => <ContactGroup key={group.letter} group={group} />) : <EmptyState title="Chưa có liên hệ" description="Thêm bạn bè để bắt đầu trò chuyện." />}
    {state.isAdding && <AddContactModal state={state} />}{state.userId && <PersonProfilePanel state={state} />}
  </SidebarPanel>
}
