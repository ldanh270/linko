"use client"

import { SidebarHeader } from "@/shared/layout/SidebarHeader"
import { SidebarPanel } from "@/shared/layout/SidebarPanel"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Accordion } from "@/shared/components/Accordion"
import { Button } from "@/shared/components/Button"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { ProfileIdentity } from "@/features/profile/components/ProfileIdentity"
import { ProfileEditModal } from "@/features/profile/components/ProfileEditModal/ProfileEditModal"
import { useSettingsPage } from "../hooks/useSettingsPage"
import { SETTINGS_SECTIONS } from "../settings.constants"
import { PersonalInfoSection } from "./PersonalInfoSection"
import { AppearanceSection } from "./AppearanceSection"
import { SettingsDisclosure } from "./SettingsDisclosure"
import { LogoutDialog } from "./LogoutDialog/LogoutDialog"

/** Render the Settings reference with real identity, theme and logout behavior. UI only. */
export function SettingsSidebar() {
  const state = useSettingsPage()
  return <SidebarPanel header={<SidebarHeader title="Cài đặt" />}>
    {state.profile.query.isError && state.profile.query.data && <p role="alert" className="composer-error px-6">Không thể làm mới thông tin tài khoản.</p>}
    {state.profile.query.isPending ? <LoadingState label="Đang tải cài đặt" /> : !state.profile.query.data ? <ErrorState title="Không thể tải tài khoản" onRetry={state.profile.onRetry} /> :
      <ProfileIdentity name={state.profile.query.data.displayName} username={state.profile.query.data.username} avatarUrl={state.profile.query.data.avatarUrl} onEdit={state.profile.onOpenEdit} />}
      <div className="profile-sections">
        <Accordion id="settings-personal" title="Thông tin cá nhân" isOpen={state.section === SETTINGS_SECTIONS.PERSONAL} onToggle={state.onTogglePersonal}>{state.profile.query.data ? <PersonalInfoSection profile={state.profile} onEdit={state.profile.onOpenEdit} /> : <p className="quiet-copy">Thông tin tài khoản chưa khả dụng.</p>}</Accordion>
        {state.explanations.map((section) => <SettingsDisclosure key={section.id} section={section} />)}
        <Accordion id="settings-appearance" title="Giao diện" isOpen={state.section === SETTINGS_SECTIONS.APPEARANCE} onToggle={state.onToggleAppearance}><AppearanceSection options={state.themeOptions} /></Accordion>
        <Button className="mt-4 w-full" variant="ghost" onClick={state.logout.onOpen}><Icon name={ICON_NAMES.LOGOUT} />Đăng xuất</Button>
      </div>{state.profile.isEditing && <ProfileEditModal state={state.profile} onClose={state.profile.onCloseEdit} />}
    {state.logout.isOpen && <LogoutDialog state={state.logout} />}
  </SidebarPanel>
}
