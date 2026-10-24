import type { useConversationPane } from "../hooks/useConversationPane"
import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import { IconButton } from "@/shared/components/IconButton"
import { DropdownMenu } from "@/shared/components/DropdownMenu/DropdownMenu"
import { SearchInput } from "@/shared/components/SearchInput"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

/** Header view prepared by the conversation hook. */
export interface ConversationHeaderProps { readonly header: ReturnType<typeof useConversationPane>["header"] }

/** Render identity and supported conversation tools in reference positions. UI only. */
export function ConversationHeader({ header }: ConversationHeaderProps) {
  return <div><header className="conversation-header">
    <div className="conversation-identity"><Link href={header.backHref} aria-label="Về danh sách tin nhắn" className="conversation-mobile-back"><Icon name={ICON_NAMES.BACK} /></Link><Avatar label={header.title} src={header.avatarUrl} /><h2>{header.title}</h2></div>
    <div className="conversation-actions"><IconButton label="Tìm trong tin nhắn đã tải" icon={<Icon name={ICON_NAMES.SEARCH} />} onClick={header.onToggleSearch} />
      <IconButton className="call-action" label="Gọi thoại chưa khả dụng" disabled icon={<Icon name={ICON_NAMES.PHONE} />} /><IconButton className="call-action" label="Gọi video chưa khả dụng" disabled icon={<Icon name={ICON_NAMES.VIDEO} />} />
      <DropdownMenu label="Tùy chọn cuộc trò chuyện" items={header.actions} />
    </div>
  </header>{header.isSearchOpen && <SearchInput label="Tìm trong tin nhắn đã tải" value={header.search} stateKey={header.searchRevision} onChange={header.onSearchChange} />}</div>
}
