import { ICON_NAMES } from "../icons/icon.constants"
import { APP_ROUTES } from "./route.constants"

/** Reference destination order for the desktop rail (profile is pinned to rail-footer). */
export const APP_NAVIGATION = [
  { href: APP_ROUTES.INBOX, label: "Tin nhắn", icon: ICON_NAMES.CHAT },
  { href: APP_ROUTES.PEOPLE, label: "Danh bạ", icon: ICON_NAMES.CONTACTS },
  { href: APP_ROUTES.SETTINGS, label: "Cài đặt", icon: ICON_NAMES.SETTINGS },
] as const

/** Reference destination order for mobile bottom navigation (includes direct profile access). */
export const MOBILE_NAVIGATION = [
  ...APP_NAVIGATION,
  { href: APP_ROUTES.PROFILE, label: "Cá nhân", icon: ICON_NAMES.PROFILE },
] as const
