import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Button } from "./Button"

describe("Button", () => {
    it("can receive keyboard focus and a click", async () => {
        const onClick = vi.fn()
        render(<Button onClick={onClick}>Gửi</Button>)

        await userEvent.tab()
        expect(screen.getByRole("button", { name: "Gửi" })).toHaveFocus()
        await userEvent.keyboard("{Enter}")
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("blocks duplicate actions while loading and announces busy state", () => {
        const onClick = vi.fn()
        render(<Button isLoading onClick={onClick}>Lưu</Button>)
        const button = screen.getByRole("button", { name: "Lưu" })

        expect(button).toBeDisabled()
        expect(button).toHaveAttribute("aria-busy", "true")
        fireEvent.click(button)
        fireEvent.click(button)
        expect(onClick).not.toHaveBeenCalled()
    })

    it("has visible interaction state styles in one shared component", () => {
        render(<Button variant="secondary">Mở</Button>)
        const button = screen.getByRole("button", { name: "Mở" })

        expect(button.className).toContain("hover:")
        expect(button.className).toContain("active:")
        expect(button.className).toContain("focus-visible:")
    })
})
