import { Modal } from "@/shared/components/Modal/Modal"
import { Button } from "@/shared/components/Button"
import type { useLogoutDialog } from "./useLogoutDialog"

/** Confirmation state supplied by the dedicated logout hook. */
export interface LogoutDialogProps { readonly state: ReturnType<typeof useLogoutDialog> }

/** Render the destructive-session confirmation with shared focus behavior. UI only. */
export function LogoutDialog({ state }: LogoutDialogProps) {
  return <Modal title="Đăng xuất khỏi Linko?" onClose={state.onClose}><p className="quiet-copy">Bạn sẽ cần đăng nhập lại để xem tin nhắn.</p>{state.error && <p className="composer-error" role="alert">{state.error}</p>}<div className="mt-6 flex justify-end gap-3"><Button variant="secondary" disabled={state.isPending} onClick={state.onClose}>Ở lại</Button><Button variant="danger" isLoading={state.isPending} onClick={state.onConfirm}>Đăng xuất</Button></div></Modal>
}
