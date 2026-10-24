import { Avatar } from "@/shared/components/Avatar"
import { IconButton } from "@/shared/components/IconButton"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

/** Small identity view reused by profile and settings without private entity coupling. */
export interface ProfileIdentityProps { readonly name: string; readonly username: string; readonly avatarUrl: string | null; readonly onEdit?: () => void }

/** Render the reference's centered avatar/name header without inventing online presence. UI only. */
export function ProfileIdentity({ name, username, avatarUrl, onEdit }: ProfileIdentityProps) {
  return <section className="reference-identity"><div className="identity-avatar"><Avatar label={name} src={avatarUrl} size="large" />{onEdit && <IconButton label="Chỉnh sửa ảnh đại diện" icon={<Icon name={ICON_NAMES.EDIT} />} onClick={onEdit} />}</div><h2>{name}</h2><p className="identity-subtitle">@{username}</p></section>
}
