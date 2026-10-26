import type { useConversationPane } from "../hooks/useConversationPane"
import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import { IconButton } from "@/shared/components/IconButton"
import { SearchInput } from "@/shared/components/SearchInput"
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
      <header className="conversation-header">
        <div className="conversation-identity">
          <Link href={header.backHref} aria-label="Về danh sách tin nhắn" className="conversation-mobile-back">
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
              <h2>
                <Link href={peerProfileHref} className="hover:underline">
                  {header.title}
                </Link>
              </h2>
            ) : (
              <h2>{header.title}</h2>
            )}
            {isPeerOnline !== undefined && (
              <p className="text-xs text-[var(--text-secondary)]">
                {isPeerOnline ? (
                  <span className="text-[var(--positive)] font-medium">Đang hoạt động</span>
                ) : (
                  "Ngoại tuyến"
                )}
              </p>
            )}
          </div>
        </div>
        <div className="conversation-actions">
          <IconButton
            label="Tìm trong tin nhắn đã tải"
            icon={<Icon name={ICON_NAMES.SEARCH} />}
            onClick={header.onToggleSearch}
          />
          <IconButton
            className="call-action"
            label="Gọi thoại chưa khả dụng"
            disabled
            icon={<Icon name={ICON_NAMES.PHONE} />}
          />
          <IconButton
            className="call-action"
            label="Gọi video chưa khả dụng"
            disabled
            icon={<Icon name={ICON_NAMES.VIDEO} />}
          />
          <IconButton
            label={CHAT_DETAILS_COPY.OPEN_DETAILS}
            aria-expanded={header.isDetailsOpen}
            className={`conversation-details-button ${header.isDetailsOpen ? "is-active" : ""}`}
            icon={<Icon name={ICON_NAMES.MENU} />}
            onClick={header.onToggleDetails}
          />
        </div>
      </header>
      {header.isSearchOpen && (
        <SearchInput
          label="Tìm trong tin nhắn đã tải"
          value={header.search}
          stateKey={header.searchRevision}
          onChange={header.onSearchChange}
        />
      )}
    </div>
  )
}
