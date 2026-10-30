import { Modal } from "@/shared/components/Modal/Modal"
import { Avatar } from "@/shared/components/Avatar"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import type { usePeoplePage } from "../hooks/usePeoplePage"

/** Selected public-profile query and dismissal action. */
export interface PersonProfilePanelProps { readonly state: ReturnType<typeof usePeoplePage> }

/** Render the selected public profile as a focused dialog. UI only. */
export function PersonProfilePanel({ state }: PersonProfilePanelProps) {
  return <Modal title="Hồ sơ" onClose={state.onCloseProfile}>{state.profile.isPending ? <LoadingState label="Đang tải hồ sơ" /> : state.profile.isError || !state.profile.data ? <ErrorState title="Không tìm thấy hồ sơ" /> : <section className="grid justify-items-center gap-3"><Avatar label={state.profile.data.displayName} src={state.profile.data.avatarUrl} size="large" /><h2 className="font-semibold">{state.profile.data.displayName}</h2><p className="quiet-copy">@{state.profile.data.username}</p><p>{state.profile.data.bio}</p></section>}</Modal>
}
