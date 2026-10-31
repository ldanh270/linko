import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { ToastProvider } from "@/shared/components/ToastProvider"
import { CreateGroupModal } from "./CreateGroupModal"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/inbox",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/features/people/api/people.api", () => ({
  listFriends: vi.fn().mockResolvedValue([
    { id: "f1", username: "alice", displayName: "Alice Nguyen", avatarUrl: null },
    { id: "f2", username: "bob", displayName: "Bob Tran", avatarUrl: null },
  ]),
  openDirectChat: vi.fn().mockResolvedValue({ id: "conv-1" }),
}))

vi.mock("../../api/groups.api", () => ({
  createGroup: vi.fn().mockResolvedValue({ id: "g1", name: "Hội bạn thân" }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    )
  }
}

describe("CreateGroupModal", () => {
  it("renders group name input and create button", () => {
    const onClose = vi.fn()
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <CreateGroupModal isOpen onClose={onClose} />
      </Wrapper>,
    )

    expect(screen.getByRole("heading", { name: "Tạo nhóm mới" })).toBeDefined()
    expect(screen.getByPlaceholderText("Nhập tên nhóm...")).toBeDefined()
    expect(screen.getByText("Thêm bạn bè vào nhóm")).toBeDefined()
    expect(screen.getByRole("button", { name: "Tạo nhóm" })).toBeDefined()
  })

  it("updates name input when typed and handles cancel click", () => {
    const onClose = vi.fn()
    const Wrapper = createWrapper()

    render(
      <Wrapper>
        <CreateGroupModal isOpen onClose={onClose} />
      </Wrapper>,
    )

    const nameInput = screen.getByPlaceholderText("Nhập tên nhóm...")
    fireEvent.change(nameInput, { target: { value: "Team Linko" } })
    expect((nameInput as HTMLInputElement).value).toBe("Team Linko")

    const cancelBtn = screen.getByRole("button", { name: "Hủy" })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalled()
  })
})
