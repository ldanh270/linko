import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { Card, CardHeader, CardContent } from "./Card"

describe("Card component", () => {
  it("renders structured card with header and content", () => {
    render(
      <Card>
        <CardHeader title="Thông tin" description="Chi tiết tài khoản" action={<button>Sửa</button>} />
        <CardContent>
          <p>Nội dung thẻ</p>
        </CardContent>
      </Card>
    )
    expect(screen.getByText("Thông tin")).toBeInTheDocument()
    expect(screen.getByText("Chi tiết tài khoản")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sửa" })).toBeInTheDocument()
    expect(screen.getByText("Nội dung thẻ")).toBeInTheDocument()
  })
})
