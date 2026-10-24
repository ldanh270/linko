"use client"

import { USER_PROFILE_FIELDS } from "@linko/contracts"
import { SidebarPanel } from "@/shared/layout/SidebarPanel"
import { SidebarHeader } from "@/shared/layout/SidebarHeader"
import { IconButton } from "@/shared/components/IconButton"
import { Accordion } from "@/shared/components/Accordion"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useProfileSidebar } from "../hooks/useProfileSidebar"
import { PROFILE_SECTIONS } from "../profile.constants"
import { ProfileIdentity } from "./ProfileIdentity"
import { ProfileAbout } from "./ProfileAbout"
import { ProfileAttachments } from "./ProfileAttachments"
import { ProfileEditModal } from "./ProfileEditModal/ProfileEditModal"

/** Render the My Profile reference panel with real account details and editing. UI only. */
export function ProfileSidebar() {
  const state = useProfileSidebar()
  return <SidebarPanel header={<SidebarHeader title="Hồ sơ của tôi" action={<IconButton label="Chỉnh sửa hồ sơ" icon={<Icon name={ICON_NAMES.MENU} />} onClick={state.onOpenEdit} disabled={!state.query.data} />} />}>
    {state.query.isPending ? <LoadingState label="Đang tải hồ sơ" /> : !state.query.data ? <ErrorState title="Không thể tải hồ sơ" onRetry={state.onRetry} /> : <>
      {state.query.isError && <p role="alert" className="composer-error px-6">Không thể làm mới hồ sơ.</p>}
      <ProfileIdentity name={state.query.data[USER_PROFILE_FIELDS.DISPLAY_NAME]} username={state.query.data[USER_PROFILE_FIELDS.USERNAME]} avatarUrl={state.query.data[USER_PROFILE_FIELDS.AVATAR_URL]} />
      <div className="profile-sections"><p className="profile-biography">{state.query.data[USER_PROFILE_FIELDS.BIO] || "Chưa có giới thiệu."}</p>
        <Accordion id="profile-about" title="Giới thiệu" icon={ICON_NAMES.PROFILE} isOpen={state.section === PROFILE_SECTIONS.ABOUT} onToggle={state.onToggleAbout}><ProfileAbout details={state.details} /></Accordion>
        <Accordion id="profile-files" title="Tệp đính kèm" icon={ICON_NAMES.ATTACH} isOpen={state.section === PROFILE_SECTIONS.FILES} onToggle={state.onToggleFiles}><ProfileAttachments /></Accordion>
      </div>{state.isEditing && <ProfileEditModal state={state} onClose={state.onCloseEdit} />}
    </>}
  </SidebarPanel>
}
