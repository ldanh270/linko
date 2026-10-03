import { act, renderHook } from "@testing-library/react"
import { z } from "zod"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useQueryParamState } from "./useQueryParamState"

const navigation = vi.hoisted(() => ({
    search: "",
    push: vi.fn(),
    replace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
    usePathname: () => "/inbox",
    useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
    useSearchParams: () => new URLSearchParams(navigation.search),
}))

beforeEach(() => {
    navigation.search = ""
    navigation.push.mockClear()
    navigation.replace.mockClear()
})

describe("useQueryParamState", () => {
    it("falls back to the default for invalid values", () => {
        navigation.search = "page=-2"
        const { result } = renderHook(() => useQueryParamState("page", z.coerce.number().int().positive(), 1))
        expect(result.current.value).toBe(1)
    })

    it("replaces keystroke updates and omits default values", () => {
        navigation.search = "tab=groups"
        const { result } = renderHook(() => useQueryParamState("tab", z.enum(["all", "groups"]), "all"))

        act(() => result.current.setValue("all", { history: "replace" }))

        expect(navigation.replace).toHaveBeenCalledWith("/inbox", { scroll: false })
        expect(navigation.push).not.toHaveBeenCalled()
    })

    it("pushes discrete changes while preserving unrelated params and resetting page", () => {
        navigation.search = "page=3&sort=recent"
        const { result } = renderHook(() => useQueryParamState("tab", z.enum(["all", "groups"]), "all"))

        act(() => result.current.setValue("groups", { history: "push" }))

        expect(navigation.push).toHaveBeenCalledWith("/inbox?sort=recent&tab=groups", { scroll: false })
    })
})
