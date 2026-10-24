import Image from "next/image"
import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import type { AttachmentViewModel } from "../chat.types"

/** Prepared attachment display fields keep calculations outside JSX. */
export interface MessageAttachmentProps { readonly file: AttachmentViewModel }

/** Render an image preview or downloadable file using the existing viewer. UI only. */
export function MessageAttachment({ file }: MessageAttachmentProps) {
  return <Link className="attachment-card" href={file.href}>
    {file.imageUrl ? <Image className="attachment-image" src={file.imageUrl} alt={file.name} width={240} height={160} unoptimized /> : <><Icon name={ICON_NAMES.FILE} /><span><strong>{file.name}</strong><small>{file.sizeLabel}</small></span><Icon name={ICON_NAMES.DOWNLOAD} /></>}
  </Link>
}
