"use client"

import Image from "next/image"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { useAttachmentViewer } from "../hooks/useAttachmentViewer"

/**
 * Render authorized attachment preview and download screen with automatic memory URL revocation.
 * Strictly presentation only; file request lifecycle lives in useAttachmentViewer.
 */
export function AttachmentViewerPage() {
  const { download, isLoading, hasError, isImage, handleRetry } = useAttachmentViewer()
  const fileName = "attachment"

  return (
    <section className="mx-auto grid min-h-[60dvh] max-w-5xl content-start gap-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Tệp riêng tư</p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">
            Xem tệp đính kèm
          </h1>
        </div>
        <Link href={APP_ROUTES.INBOX}>Quay lại hộp thư</Link>
      </header>

      {isLoading ? (
        <LoadingState label="Đang tải tệp an toàn" />
      ) : hasError || !download ? (
        <ErrorState
          title="Không thể mở tệp hoặc bạn không còn quyền truy cập"
          onRetry={handleRetry}
        />
      ) : isImage ? (
        <figure className="grid min-h-80 place-items-center rounded-2xl border border-border bg-surface p-4">
          <Image
            src={download.objectUrl}
            alt="Ảnh đính kèm trong cuộc trò chuyện"
            width={1600}
            height={1200}
            unoptimized
            className="max-h-[65dvh] max-w-full object-contain"
          />
        </figure>
      ) : (
        <section className="grid justify-items-center gap-4 rounded-2xl border border-border bg-surface p-10 text-center">
          <Icon name={ICON_NAMES.DOWNLOAD} className="h-12 w-12 text-brand" />
          <p className="text-sm text-text-secondary">
            Định dạng này được tải xuống thiết bị của bạn.
          </p>
          <a
            href={download.objectUrl}
            download={fileName}
            className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 font-semibold text-brand-contrast transition-colors hover:bg-brand-hover"
          >
            Tải tệp
          </a>
        </section>
      )}
    </section>
  )
}
