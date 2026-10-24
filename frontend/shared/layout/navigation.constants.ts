import { ICON_NAMES } from "../icons/icon.constants"
import { APP_ROUTES } from "./route.constants"

/** Reference destination order shared by both navigation surfaces. */
export const APP_NAVIGATION = [
  { href: APP_ROUTES.PROFILE, label: "Cá nhân", icon: ICON_NAMES.PROFILE },
  { href: APP_ROUTES.INBOX, label: "Tin nhắn", icon: ICON_NAMES.CHAT },
  { href: APP_ROUTES.GROUPS, label: "Nhóm", icon: ICON_NAMES.GROUP },
  { href: APP_ROUTES.PEOPLE, label: "Bạn bè", icon: ICON_NAMES.CONTACTS },
  { href: APP_ROUTES.SETTINGS, label: "Cài đặt", icon: ICON_NAMES.SETTINGS },
] as const
