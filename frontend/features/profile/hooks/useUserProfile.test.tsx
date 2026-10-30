import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import type { ProfileDto, PublicUserDto } from "@linko/contracts"
import { useUserProfile } from "./useUserProfile"

const myProfile: ProfileDto = {
  id: "u1",
  username: "myuser",
  displayName: "My Name",
  email: "me@example.com",
  phone: null,
  bio: "My bio",
  avatarUrl: null,
  backgroundUrl: null,
}

const otherPublicProfile: PublicUserDto = {
  id: "u2",
  username: "otheruser",
  displayName: "Other Name",
  bio: "Other bio",
  avatarUrl: "https://example.com/avatar.png",
  backgroundUrl: null,
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/profile",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/shared/components/useToast", () => ({
  useToast: () => ({ show: vi.fn(), dismiss: vi.fn() }),
}))

vi.mock("./useCurrentProfile", () => ({
  useCurrentProfile: () => ({ data: myProfile, isPending: false, isError: false }),
}))

vi.mock("../api/profile.api", () => ({
  getMine: vi.fn(async () => myProfile),
  getPublicUser: vi.fn(async (userId: string) => {
    if (userId === "u2") return otherPublicProfile
    throw new Error("User not found")
  }),
  updateMine: vi.fn(),
}))

vi.mock("@/features/people/api/people.api", () => ({
  listFriends: vi.fn(async () => [{ ...otherPublicProfile }]),
  requestFriend: vi.fn(),
  openDirectChat: vi.fn(),
  acceptFriend: vi.fn(),
  declineFriend: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useUserProfile", () => {
  it("should_resolve_as_own_profile_when_no_target_user_id_is_provided", () => {
    const { result } = renderHook(() => useUserProfile(), { wrapper: createWrapper() })
    expect(result.current.isOwnProfile).toBe(true)
    if (result.current.isOwnProfile) {
      expect(result.current.editor).toBeDefined()
    }
  })

  it("should_resolve_as_own_profile_when_target_id_matches_current_user", () => {
    const { result } = renderHook(() => useUserProfile("u1"), { wrapper: createWrapper() })
    expect(result.current.isOwnProfile).toBe(true)
  })

  it("should_resolve_as_public_profile_when_target_id_belongs_to_another_user", async () => {
    const { result } = renderHook(() => useUserProfile("u2"), { wrapper: createWrapper() })
    expect(result.current.isOwnProfile).toBe(false)
    await waitFor(() => {
      expect(result.current.user).toBeDefined()
    })
    if (!result.current.isOwnProfile) {
      expect(result.current.user?.username).toBe("otheruser")
      expect(result.current.user?.displayName).toBe("Other Name")
      expect(typeof result.current.onOpenChat).toBe("function")
      expect(typeof result.current.onRequestFriend).toBe("function")
    }
  })
})
