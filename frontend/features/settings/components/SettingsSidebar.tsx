"use client"

import Link from "next/link"
import { SidebarHeader } from "@/shared/layout/SidebarHeader"
import { SidebarPanel } from "@/shared/layout/SidebarPanel"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Accordion } from "@/shared/components/Accordion"
import { Button } from "@/shared/components/Button"
import { Avatar } from "@/shared/components/Avatar"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { useI18n } from "@/shared/i18n/useI18n"
import { useSettingsPage } from "../hooks/useSettingsPage"
import { SETTINGS_SECTIONS } from "../settings.constants"
import { ChatSettingsSection } from "./ChatSettingsSection"
import { LanguageSection } from "./LanguageSection"
import { AppearanceSection } from "./AppearanceSection"
import { SoundNotificationSection } from "./SoundNotificationSection"
import { SettingsDisclosure } from "./SettingsDisclosure"
import { LogoutDialog } from "./LogoutDialog/LogoutDialog"

/** Render the Settings reference with real identity, chat options, language, theme and logout behavior. UI only. */
export function SettingsSidebar() {
  const state = useSettingsPage()
  const { copy } = useI18n()
  const profile = state.profile.query.data

  return (
    <SidebarPanel header={<SidebarHeader title={copy.settings.title} />}>
      {state.profile.query.isError && profile && (
        <p role="alert" className="composer-error px-6">
          Không thể làm mới thông tin tài khoản.
        </p>
      )}

      {state.profile.query.isPending ? (
        <LoadingState label={copy.common.loading} />
      ) : !profile ? (
        <ErrorState title="Không thể tải tài khoản" onRetry={state.profile.onRetry} />
      ) : (
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar label={profile.displayName || profile.username} src={profile.avatarUrl} size="medium" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">{profile.displayName || profile.username}</h3>
              <p className="text-xs text-[var(--text-secondary)] truncate">@{profile.username}</p>
            </div>
          </div>
          <Link href={APP_ROUTES.PROFILE}>
            <Button size="small" variant="ghost" title={copy.settings.viewProfileBtn}>
              <Icon name={ICON_NAMES.PROFILE} />
            </Button>
          </Link>
        </div>
      )}

      <div className="profile-sections overflow-y-auto">
        <Accordion
          id="settings-chat"
          title={copy.settings.chatTitle}
          isOpen={state.section === SETTINGS_SECTIONS.CHAT}
          onToggle={state.onToggleChat}
        >
          <ChatSettingsSection />
        </Accordion>

        <Accordion
          id="settings-language"
          title={copy.settings.languageTitle}
          isOpen={state.section === SETTINGS_SECTIONS.LANGUAGE}
          onToggle={state.onToggleLanguage}
        >
          <LanguageSection />
        </Accordion>

        <Accordion
          id="settings-appearance"
          title={copy.settings.appearanceTitle}
          isOpen={state.section === SETTINGS_SECTIONS.APPEARANCE}
          onToggle={state.onToggleAppearance}
        >
          <AppearanceSection options={state.themeOptions} />
        </Accordion>

        <Accordion
          id="settings-sound"
          title={copy.settings.soundTitle}
          isOpen={state.section === SETTINGS_SECTIONS.SOUND}
          onToggle={state.onToggleSound}
        >
          <SoundNotificationSection />
        </Accordion>

        {state.explanations.map((section) => (
          <SettingsDisclosure key={section.id} section={section} />
        ))}

        <Button className="mt-4 w-full" variant="ghost" onClick={state.logout.onOpen}>
          <Icon name={ICON_NAMES.LOGOUT} />
          {copy.settings.logoutBtn}
        </Button>
      </div>

      {state.logout.isOpen && <LogoutDialog state={state.logout} />}
    </SidebarPanel>
  )
}
