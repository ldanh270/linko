import { Button } from "@/shared/components/Button"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

export interface PendingRequestsBannerProps {
  readonly count: number
  readonly onOpen: () => void
}

/** Render a prominent notification banner for incoming friend requests. UI only. */
export function PendingRequestsBanner({ count, onOpen }: PendingRequestsBannerProps) {
  if (count <= 0) return null

  return (
    <div className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface)] shadow-[var(--shadow-panel)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-[var(--brand)]/30 bg-[var(--brand-soft)]/20">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand)] text-white">
          <Icon name={ICON_NAMES.ADD_CONTACT} />
        </div>
        <div>
          <p className="font-semibold text-sm">Lời mời kết bạn đang chờ</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Bạn có {count} lời mời kết bạn mới cần phản hồi.
          </p>
        </div>
      </div>
      <Button size="small" variant="secondary" onClick={onOpen}>
        Xem lời mời ({count})
      </Button>
    </div>
  )
}
