import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ImageLightbox } from "./ImageLightbox"

describe("ImageLightbox", () => {
  const props = {
    src: "blob:http://localhost/test-image-blob",
    alt: "beach.jpg",
    name: "beach.jpg",
    onClose: vi.fn(),
  }

  it("renders image, title, download action, and close action", () => {
    render(<ImageLightbox {...props} />)

    expect(screen.getByRole("img", { name: "beach.jpg" })).toBeDefined()
    expect(screen.getByText("beach.jpg")).toBeDefined()

    const downloadLink = screen.getByLabelText("Tải xuống")
    expect(downloadLink.getAttribute("href")).toBe(props.src)
    expect(downloadLink.getAttribute("download")).toBe(props.name)

    const closeButton = screen.getByLabelText("Đóng")
    fireEvent.click(closeButton)
    expect(props.onClose).toHaveBeenCalled()
  })

  it("closes when clicking backdrop but not when clicking image", () => {
    const onClose = vi.fn()
    render(<ImageLightbox {...props} onClose={onClose} />)

    const img = screen.getByRole("img", { name: "beach.jpg" })
    fireEvent.click(img)
    expect(onClose).not.toHaveBeenCalled()

    const stage = img.parentElement!
    fireEvent.click(stage)
    expect(onClose).toHaveBeenCalled()
  })
})
