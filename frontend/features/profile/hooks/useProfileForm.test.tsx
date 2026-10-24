import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ProfileDto } from "@linko/contracts"
import { useProfileForm } from "./useProfileForm"

const profile: ProfileDto = { id: "me", username: "nguyen.an", displayName: "Nguyễn An", email: "an@example.com", phone: null, bio: "", avatarUrl: null, backgroundUrl: null }

beforeEach(() => { vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() })) })

describe("profile form", () => {
  it("should_revoke_preview_urls_on_replacement_and_unmount", () => {
    const { result, unmount } = renderHook(() => useProfileForm({ profile, isSaving: false, onSave: vi.fn(), saveError: null }))
    act(() => result.current.onAvatarChange({ target: { files: [new File(["x"], "a.png", { type: "image/png" })] } } as unknown as React.ChangeEvent<HTMLInputElement>))
    expect(result.current.avatarPreview).toBe("blob:preview")
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview")
  })
  it("should_reject_unsupported_and_oversized_images_before_saving", () => {
    const { result } = renderHook(() => useProfileForm({ profile, isSaving: false, onSave: vi.fn(), saveError: null }))
    act(() => result.current.onAvatarChange({ target: { files: [new File(["x"], "a.svg", { type: "image/svg+xml" })] } } as unknown as React.ChangeEvent<HTMLInputElement>))
    expect(result.current.imageError).toBeTruthy()
    expect(result.current.avatarPreview).toBeNull()
  })
})
