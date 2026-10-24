import { APP_ROUTES } from "./route.constants"

/** Primary destinations shared by desktop and mobile navigation. */
export const APP_NAVIGATION = [
  { href: APP_ROUTES.INBOX, label: "Tin nhắn", symbol: "✉" },
  { href: APP_ROUTES.GROUPS, label: "Nhóm", symbol: "◇" },
  { href: APP_ROUTES.PEOPLE, label: "Bạn bè", symbol: "♧" },
  { href: APP_ROUTES.PROFILE, label: "Cá nhân", symbol: "◯" },
  { href: APP_ROUTES.SETTINGS, label: "Cài đặt", symbol: "⚙" },
] as const
