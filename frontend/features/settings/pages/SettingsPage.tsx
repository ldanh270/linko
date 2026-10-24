"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/shared/theme/useTheme"
import { THEME_MODE } from "@/shared/theme/theme.constants"
import { useSession } from "@/features/auth/hooks/useSession"
import { Button } from "@/shared/components/Button"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { PageHeader } from "@/shared/components/PageHeader"
import { SurfacePanel } from "@/shared/components/SurfacePanel"

const THEME_OPTIONS = [{ value: THEME_MODE.SYSTEM, label: "Theo thiết bị" }, { value: THEME_MODE.LIGHT, label: "Sáng" }, { value: THEME_MODE.DARK, label: "Tối" }] as const

/** Let a user choose appearance and confirm signing out. */
export function SettingsPage() {
  const { mode, setMode } = useTheme()
  const { signOut } = useSession()
  const router = useRouter()
  const [showLogout, setShowLogout] = useState(false)
  const [logoutError, setLogoutError] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const onLogout = async () => { setIsLoggingOut(true); setLogoutError(false); try { await signOut(); router.replace(APP_ROUTES.LOGIN) } catch { setLogoutError(true) } finally { setIsLoggingOut(false); setShowLogout(false) } }
  return <section className="mx-auto grid max-w-3xl gap-6"><PageHeader eyebrow="Tùy chỉnh" title="Cài đặt" />
    <SurfacePanel className="p-5 sm:p-6"><h2 className="text-lg font-semibold">Giao diện</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Chọn cách Linko hiển thị trên thiết bị này.</p><fieldset className="mt-5 grid gap-3 sm:grid-cols-3"><legend className="sr-only">Chế độ giao diện</legend>{THEME_OPTIONS.map((option) => <label key={option.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${mode===option.value?"border-[var(--brand)] bg-[var(--brand-soft)]":"border-[var(--border)] hover:bg-[var(--surface-subtle)]"}`}><input type="radio" name="theme" value={option.value} checked={mode===option.value} onChange={() => setMode(option.value)} />{option.label}</label>)}</fieldset></SurfacePanel>
    <SurfacePanel className="p-5 sm:p-6"><h2 className="text-lg font-semibold">Tài khoản</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Phiên đăng nhập được bảo vệ trên thiết bị của bạn.</p>{logoutError && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">Không thể kết nối để đăng xuất. Vui lòng thử lại.</p>}<Button variant="danger" className="mt-5" onClick={() => setShowLogout(true)}>Đăng xuất</Button></SurfacePanel>
    {showLogout && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><SurfacePanel role="alertdialog" aria-modal="true" aria-labelledby="logout-heading" className="w-full max-w-md p-6"><h2 id="logout-heading" className="text-xl font-semibold">Đăng xuất khỏi Linko?</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Bạn sẽ cần đăng nhập lại để xem tin nhắn.</p><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowLogout(false)}>Ở lại</Button><Button variant="danger" isLoading={isLoggingOut} onClick={() => void onLogout()}>Đăng xuất</Button></div></SurfacePanel></div>}
  </section>
}
