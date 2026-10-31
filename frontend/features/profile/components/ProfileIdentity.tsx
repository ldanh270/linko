import { Avatar } from "@/shared/components/Avatar"
import { IconButton } from "@/shared/components/IconButton"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

/** Small identity view reused by profile and settings without private entity coupling. */
export interface ProfileIdentityProps { readonly name: string; readonly username: string; readonly avatarUrl: string | null; readonly onEdit?: () => void }

/** Render the reference's centered avatar/name header without inventing online presence. UI only. */
export function ProfileIdentity({ name, username, avatarUrl, onEdit }: ProfileIdentityProps) {
  return (
    <section className="grid justify-items-center gap-3 px-4 pt-2 pb-4 border-b border-border">
      <div className="relative [&>.avatar]:border [&>.avatar]:border-border [&>.avatar]:p-1 [&>.avatar]:bg-surface [&>.avatar]:rounded-full [&_img]:rounded-full">
        <Avatar label={name} src={avatarUrl} size="large" />
        {onEdit && (
          <IconButton
            className="absolute bottom-0 -right-1.5 bg-input-surface rounded-full w-9 h-9 hover:bg-brand-soft hover:text-brand transition-colors"
            label="Chỉnh sửa ảnh đại diện"
            icon={<Icon name={ICON_NAMES.EDIT} />}
            onClick={onEdit}
          />
        )}
      </div>
      <h2 className="mt-1 text-base font-semibold text-text-primary">{name}</h2>
      <p className="text-sm text-text-secondary -mt-2">@{username}</p>
    </section>
  )
}
