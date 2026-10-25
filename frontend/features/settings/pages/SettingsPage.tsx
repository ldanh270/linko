"use client"

import { Button } from "@/shared/components/Button"
import { PageHeader } from "@/shared/components/PageHeader"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { ProfileIdentity } from "@/features/profile/components/ProfileIdentity"
import { ProfileEditModal } from "@/features/profile/components/ProfileEditModal/ProfileEditModal"
import { useSettingsPage } from "../hooks/useSettingsPage"
import { PersonalInfoSection } from "../components/PersonalInfoSection"
import { AppearanceSection } from "../components/AppearanceSection"
import { SettingsDisclosure } from "../components/SettingsDisclosure"
import { LogoutDialog } from "../components/LogoutDialog/LogoutDialog"

/** Render the full-page application settings with clean section panels. UI only. */
export function SettingsPage() {
  const state = useSettingsPage()
  const profileData = state.profile.query.data

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <PageHeader
        eyebrow="Tùy chỉnh & Hệ thống"
        title="Cài đặt"
        description="Quản lý tùy chọn cá nhân, hiển thị giao diện, quyền riêng tư và phiên bảo mật."
      />

      {/* Account & Profile Section */}
      <article className="surface-panel p-6 grid gap-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h2 className="text-lg font-semibold">Tài khoản & Hồ sơ</h2>
            <p className="text-sm text-[var(--text-secondary)]">Thông tin định danh và tài khoản hiển thị trên Linko.</p>
          </div>
          {profileData && (
            <Button size="small" variant="secondary" onClick={state.profile.onOpenEdit}>
              <Icon name={ICON_NAMES.EDIT} /> Chỉnh sửa
            </Button>
          )}
        </div>

        {state.profile.query.isPending ? (
          <LoadingState label="Đang tải thông tin tài khoản..." />
        ) : !profileData ? (
          <ErrorState title="Không thể tải tài khoản" onRetry={state.profile.onRetry} />
        ) : (
          <div className="grid gap-6">
            <ProfileIdentity
              name={profileData.displayName}
              username={profileData.username}
              avatarUrl={profileData.avatarUrl}
              onEdit={state.profile.onOpenEdit}
            />
            <div className="border-t border-[var(--border)] pt-4">
              <PersonalInfoSection profile={state.profile} onEdit={state.profile.onOpenEdit} />
            </div>
          </div>
        )}
      </article>

      {/* Appearance Section */}
      <article className="surface-panel p-6 grid gap-4">
        <div className="border-b border-[var(--border)] pb-3">
          <h2 className="text-lg font-semibold">Giao diện hiển thị</h2>
          <p className="text-sm text-[var(--text-secondary)]">Chọn chủ đề hiển thị phù hợp với thiết bị của bạn.</p>
        </div>
        <AppearanceSection options={state.themeOptions} />
      </article>

      {/* Privacy, Security & Help Explanations */}
      <article className="surface-panel p-6 grid gap-4">
        <div className="border-b border-[var(--border)] pb-3">
          <h2 className="text-lg font-semibold">Bảo mật & Quyền riêng tư</h2>
          <p className="text-sm text-[var(--text-secondary)]">Chính sách bảo vệ thông tin và các tính năng hỗ trợ.</p>
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
          <h2 className="text-lg font-semibold text-[var(--danger)]">Đăng xuất tài khoản</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Kết thúc phiên làm việc trên thiết bị này. Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng Linko.
          </p>
        </div>
        <div>
          <Button variant="danger" onClick={state.logout.onOpen}>
            <Icon name={ICON_NAMES.LOGOUT} /> Đăng xuất khỏi thiết bị
          </Button>
        </div>
      </article>

      {state.profile.isEditing && (
        <ProfileEditModal state={state.profile} onClose={state.profile.onCloseEdit} />
      )}
      {state.logout.isOpen && <LogoutDialog state={state.logout} />}
    </section>
  )
}
