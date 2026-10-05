"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { downloadAttachment, type AttachmentDownload } from "@/features/chat/api/attachments.api"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Link } from "@/shared/components/Link"

/** Fetch one authorized attachment and revoke its temporary URL when closed. */
export function AttachmentViewerPage() {
  const { messageId, attachmentId } = useParams<{ messageId: string; attachmentId: string }>()
  const [download, setDownload] = useState<AttachmentDownload | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [hasError, setError] = useState(false)
  const requestFile = useCallback((signal?: AbortSignal) => downloadAttachment({ messageId, attachmentId, signal }), [attachmentId, messageId])
  useEffect(() => {
    const controller = new AbortController()
    let isActive = true
    void requestFile(controller.signal).then((result) => {
      if (isActive) setDownload((current) => { current?.revoke(); return result })
      else result.revoke()
    }).catch(() => { if (isActive) setError(true) }).finally(() => { if (isActive) setLoading(false) })
    return () => { isActive = false; controller.abort() }
  }, [requestFile])
  useEffect(() => () => download?.revoke(), [download])
  const retry = () => {
    setLoading(true); setError(false)
    void requestFile().then((result) => setDownload((current) => { current?.revoke(); return result })).catch(() => setError(true)).finally(() => setLoading(false))
  }
  const isImage = download?.blob.type.startsWith("image/") ?? false
  const fileName = "attachment"
  return <section className="mx-auto grid min-h-[60dvh] max-w-5xl content-start gap-5"><header className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[var(--brand)]">Tệp riêng tư</p><h1 className="mt-1 text-2xl font-bold">Xem tệp đính kèm</h1></div><Link href="/inbox">Quay lại hộp thư</Link></header>
    {isLoading ? <LoadingState label="Đang tải tệp an toàn" /> : hasError || !download ? <ErrorState title="Không thể mở tệp hoặc bạn không còn quyền truy cập" onRetry={retry} /> : isImage ? <figure className="grid min-h-80 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><Image src={download.objectUrl} alt="Ảnh đính kèm trong cuộc trò chuyện" width={1600} height={1200} unoptimized className="max-h-[65dvh] max-w-full object-contain" /></figure> : <section className="grid justify-items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center"><span aria-hidden="true" className="text-5xl">↧</span><p className="text-[var(--text-secondary)]">Định dạng này được tải xuống thiết bị của bạn.</p><a href={download.objectUrl} download={fileName} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--brand)] px-5 font-semibold text-[var(--brand-contrast)]">Tải tệp</a></section>}
  </section>
}
