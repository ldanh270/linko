import { Link } from "@/shared/components/Link"
import { APP_ROUTES } from "@/shared/layout/route.constants"

/** Explain the existing per-conversation file access model. UI only. */
export function ProfileAttachments() {
  return <p className="quiet-copy">Tệp được lưu trong từng cuộc trò chuyện. <Link href={APP_ROUTES.INBOX}>Mở tin nhắn để xem tệp.</Link></p>
}
