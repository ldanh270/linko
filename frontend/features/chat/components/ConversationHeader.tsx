import type { useConversationPane } from "../hooks/useConversationPane"
import { Avatar } from "@/shared/components/Avatar"
import { PresenceIndicator } from "@/shared/components/PresenceIndicator"
import { Link } from "@/shared/components/Link"
import { IconButton } from "@/shared/components/IconButton"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { usePresence } from "@/shared/presence/usePresence"
import { CHAT_DETAILS_COPY } from "../chat.constants"

/** Header view prepared by the conversation hook. */
export interface ConversationHeaderProps {
  readonly header: ReturnType<typeof useConversationPane>["header"]
}

/** Render identity and supported conversation tools in reference positions. UI only. */
export function ConversationHeader({ header }: ConversationHeaderProps) {
  const presence = usePresence(header.peerId ? [header.peerId] : [])
  const isPeerOnline = header.peerId ? presence.isOnline(header.peerId) : undefined
  const peerProfileHref = header.peerId
    ? buildAppRoute(APP_ROUTES.USER_PROFILE, { userId: header.peerId })
    : null

  return (
    <div>
      <header className="relative z-10 flex min-h-[var(--header-height)] items-center justify-between gap-3 px-4 py-3.5 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={header.backHref} aria-label="Về danh sách tin nhắn" className="lg:hidden mr-1 flex-none text-[var(--text-secondary)] hover:text-[var(--brand)]">
            <Icon name={ICON_NAMES.BACK} />
          </Link>
          {peerProfileHref ? (
            <Link href={peerProfileHref} title="Xem trang cá nhân" className="hover:opacity-85 transition-opacity">
              <Avatar label={header.title} src={header.avatarUrl} isOnline={isPeerOnline} />
            </Link>
          ) : (
            <Avatar label={header.title} src={header.avatarUrl} isOnline={isPeerOnline} />
          )}
          <div className="min-w-0">
            {peerProfileHref ? (
              <h2 className="text-base font-semibold truncate text-[var(--text-primary)]">
                <Link href={peerProfileHref} className="hover:underline">
                  {header.title}
                </Link>
              </h2>
            ) : (
              <h2 className="text-base font-semibold truncate text-[var(--text-primary)]">{header.title}</h2>
            )}
            {isPeerOnline !== undefined && (
              <PresenceIndicator
                isOnline={isPeerOnline}
                variant="text"
                labelOnline="Đang hoạt động"
                labelOffline="Ngoại tuyến"
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <IconButton
            label="Tìm trong tin nhắn đã tải"
            icon={<Icon name={ICON_NAMES.SEARCH} />}
            onClick={header.onToggleSearch}
          />
          <IconButton
            className="hidden sm:inline-flex"
            label="Gọi thoại chưa khả dụng"
            disabled
            icon={<Icon name={ICON_NAMES.PHONE} />}
          />
          <IconButton
            className="hidden sm:inline-flex"
            label="Gọi video chưa khả dụng"
            disabled
            icon={<Icon name={ICON_NAMES.VIDEO} />}
          />
          <IconButton
            label={CHAT_DETAILS_COPY.OPEN_DETAILS}
            aria-expanded={header.isDetailsOpen}
            className={`transition-colors ${header.isDetailsOpen ? "text-[var(--brand)] bg-[var(--brand-soft)]" : ""}`}
            icon={<Icon name={ICON_NAMES.MENU} />}
            onClick={header.onToggleDetails}
          />
        </div>
      </header>
    </div>
  )
}
