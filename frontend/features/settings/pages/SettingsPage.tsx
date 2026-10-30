"use client"

import { Button } from "@/shared/components/Button"
import { PageHeader } from "@/shared/components/PageHeader"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { useI18n } from "@/shared/i18n/useI18n"
import { useSettingsPage } from "../hooks/useSettingsPage"
import { AccountSummarySection } from "../components/AccountSummarySection"
import { ChatSettingsSection } from "../components/ChatSettingsSection"
import { LanguageSection } from "../components/LanguageSection"
import { AppearanceSection } from "../components/AppearanceSection"
import { SoundNotificationSection } from "../components/SoundNotificationSection"
import { SettingsDisclosure } from "../components/SettingsDisclosure"
import { LogoutDialog } from "../components/LogoutDialog/LogoutDialog"

/** Render the full-page application settings with chat preferences, language, appearance and security. UI only. */
export function SettingsPage() {
  const state = useSettingsPage()
  const { copy } = useI18n()
  const profileData = state.profile.query.data

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <PageHeader
        eyebrow={copy.settings.eyebrow}
        title={copy.settings.title}
        description={copy.settings.description}
      />

      {/* Account Info Card (Read-only with direct link to /profile) */}
      {state.profile.query.isPending ? (
        <LoadingState label={copy.common.loading} />
      ) : !profileData ? (
        <ErrorState title="Không thể tải tài khoản" onRetry={state.profile.onRetry} />
      ) : (
        <AccountSummarySection profile={profileData} />
      )}

      {/* Chat Settings Section */}
      <ChatSettingsSection />

      {/* Language Section (Đa ngôn ngữ) */}
      <LanguageSection />

      {/* Sound Notifications Section */}
      <SoundNotificationSection />

      {/* Appearance Section */}
      <article className="surface-panel p-6 grid gap-4">
        <div className="border-b border-[var(--border)] pb-3">
          <h2 className="text-lg font-semibold">{copy.settings.appearanceTitle}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{copy.settings.appearanceDescription}</p>
        </div>
        <AppearanceSection options={state.themeOptions} />
      </article>

      {/* Privacy, Security & Help Explanations */}
      <article className="surface-panel p-6 grid gap-4">
        <div className="border-b border-[var(--border)] pb-3">
          <h2 className="text-lg font-semibold">{copy.settings.privacyTitle}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{copy.settings.privacyDescription}</p>
        </div>
        <div className="grid gap-3">
          {state.explanations.map((section) => (
            <SettingsDisclosure key={section.id} section={section} />
          ))}
        </div>
      </article>

      {/* Session / Danger Zone */}
      <article className="surface-panel p-6 border-[var(--danger)]/40 bg-[var(--danger)]/5 grid gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--danger)]">{copy.settings.logoutTitle}</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {copy.settings.logoutDescription}
          </p>
        </div>
        <div>
          <Button variant="danger" onClick={state.logout.onOpen}>
            <Icon name={ICON_NAMES.LOGOUT} /> {copy.settings.logoutBtn}
          </Button>
        </div>
      </article>

      {state.logout.isOpen && <LogoutDialog state={state.logout} />}
    </section>
  )
}
