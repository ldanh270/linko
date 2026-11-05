import { Button } from "@/shared/components/Button"

/** Resource states share a consistent, recoverable presentation. */
export interface UtilityFeedbackProps { readonly pending: boolean; readonly error: boolean; readonly onRetry: () => void }
/** Render a compact loading or recoverable resource error. UI only. */
export function UtilityFeedback({ pending, error, onRetry }: UtilityFeedbackProps) {
  if (pending) return <p role="status" className="p-3 text-sm text-text-secondary">Đang tải…</p>
  if (error) return <div role="alert" className="p-3 text-sm text-text-primary">Nội dung không khả dụng hoặc bạn không còn quyền truy cập. <Button variant="ghost" size="small" onClick={onRetry}>Thử lại</Button></div>
  return null
}
