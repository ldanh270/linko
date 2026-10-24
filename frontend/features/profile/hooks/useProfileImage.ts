"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { USER_PROFILE_IMAGE_TYPES, USER_PROFILE_LIMITS } from "@linko/contracts"

const INVALID_IMAGE = "Chọn ảnh JPEG, PNG hoặc WebP có dung lượng tối đa 10 MiB."

/** Validate one image slot and revoke its temporary preview when replaced or unmounted. */
export function useProfileImage() {
  const [file, setFile] = useState<File | undefined>()
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (selected && (!USER_PROFILE_IMAGE_TYPES.some((type) => type === selected.type) || selected.size > USER_PROFILE_LIMITS.MAX_IMAGE_SIZE_BYTES)) { setError(INVALID_IMAGE); return }
    setError(null); setFile(selected); setPreview(selected ? URL.createObjectURL(selected) : null)
  }
  return { file, preview, error, onChange }
}
