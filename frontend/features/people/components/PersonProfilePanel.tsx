import { Modal } from "@/shared/components/Modal/Modal"
import { Avatar } from "@/shared/components/Avatar"
import { Skeleton } from "@/shared/components/Skeleton"
import { ErrorState } from "@/shared/components/ErrorState"
import type { usePeoplePage } from "../hooks/usePeoplePage"

/** Selected public-profile query and dismissal action. */
export interface PersonProfilePanelProps { readonly state: ReturnType<typeof usePeoplePage> }

/** Render the selected public profile as a focused dialog. UI only. */
export function PersonProfilePanel({ state }: PersonProfilePanelProps) {
  return (
    <Modal title="Hồ sơ" onClose={state.onCloseProfile}>
      {state.profile.isPending ? (
        <section className="grid justify-items-center gap-3" role="status" aria-label="Đang tải hồ sơ">
          <Skeleton circle className="w-20 h-20" />
          <Skeleton className="h-5 w-36 rounded-xs mt-1" />
          <Skeleton className="h-4 w-24 rounded-xs" />
          <Skeleton className="h-10 w-full rounded-md mt-2" />
          <span className="sr-only">Đang tải hồ sơ</span>
        </section>
      ) : state.profile.isError || !state.profile.data ? (
        <ErrorState title="Không tìm thấy hồ sơ" />
      ) : (
        <section className="grid justify-items-center gap-3">
          <Avatar label={state.profile.data.displayName} src={state.profile.data.avatarUrl} size="large" />
          <h2 className="font-semibold text-text-primary">{state.profile.data.displayName}</h2>
          <p className="text-sm text-text-secondary leading-relaxed">@{state.profile.data.username}</p>
          <p className="text-sm text-text-primary">{state.profile.data.bio}</p>
        </section>
      )}
    </Modal>
  )
}
