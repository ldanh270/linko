import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { AuthForm } from "./AuthForm"
import { AUTH_FORM_COPY } from "../auth.constants"

const { router } = vi.hoisted(() => ({
  router: { replace: vi.fn(), push: vi.fn() },
}))

vi.mock("next/navigation", () => ({ useRouter: () => router }))

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("AuthForm", () => {
  it("renders password input with eye icon toggle button in login mode", () => {
    renderWithClient(<AuthForm mode="login" />)

    const passwordInput = screen.getByLabelText("Mật khẩu") as HTMLInputElement
    expect(passwordInput.type).toBe("password")

    const toggleButton = screen.getByRole("button", { name: AUTH_FORM_COPY.SHOW_PASSWORD })
    expect(toggleButton).toBeDefined()
  })

  it("toggles password visibility when the eye button is clicked", async () => {
    renderWithClient(<AuthForm mode="login" />)

    const passwordInput = screen.getByLabelText("Mật khẩu") as HTMLInputElement
    expect(passwordInput.type).toBe("password")

    const toggleButton = screen.getByRole("button", { name: AUTH_FORM_COPY.SHOW_PASSWORD })
    await userEvent.click(toggleButton)

    expect(passwordInput.type).toBe("text")
    expect(screen.getByRole("button", { name: AUTH_FORM_COPY.HIDE_PASSWORD })).toBeDefined()

    await userEvent.click(screen.getByRole("button", { name: AUTH_FORM_COPY.HIDE_PASSWORD }))
    expect(passwordInput.type).toBe("password")
    expect(screen.getByRole("button", { name: AUTH_FORM_COPY.SHOW_PASSWORD })).toBeDefined()
  })

  it("prevents mousedown default on eye toggle to keep focus in password input", () => {
    renderWithClient(<AuthForm mode="login" />)

    const toggleButton = screen.getByRole("button", { name: AUTH_FORM_COPY.SHOW_PASSWORD })
    const mousedownEvent = new MouseEvent("mousedown", { cancelable: true, bubbles: true })
    toggleButton.dispatchEvent(mousedownEvent)

    expect(mousedownEvent.defaultPrevented).toBe(true)
  })
})
