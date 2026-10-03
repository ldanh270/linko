import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider } from "./ThemeProvider"
import { useTheme } from "./useTheme"

function ThemeProbe() {
    const { mode, setMode } = useTheme()
    return <>
        <output>{mode}</output>
        <button onClick={() => setMode("dark")}>Dark</button>
        <button onClick={() => setMode("system")}>System</button>
    </>
}

beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute("data-theme")
    vi.stubGlobal("matchMedia", vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })))
})

describe("useTheme", () => {
    it("switches between dark and the system's light preference", async () => {
        render(<ThemeProvider><ThemeProbe /></ThemeProvider>)

        expect(document.documentElement.dataset.theme).toBe("light")
        await userEvent.click(screen.getByRole("button", { name: "Dark" }))
        expect(document.documentElement.dataset.theme).toBe("dark")
        expect(localStorage.getItem("linko-theme")).toBe("dark")
        await userEvent.click(screen.getByRole("button", { name: "System" }))
        expect(document.documentElement.dataset.theme).toBe("light")
    })

    it("loads a saved light preference even when the system prefers dark", () => {
        localStorage.setItem("linko-theme", "light")
        vi.stubGlobal("matchMedia", vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })))

        render(<ThemeProvider><ThemeProbe /></ThemeProvider>)

        expect(screen.getByText("light")).toBeInTheDocument()
        expect(document.documentElement.dataset.theme).toBe("light")
    })
})
