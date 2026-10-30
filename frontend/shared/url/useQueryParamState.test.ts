import { act, renderHook } from "@testing-library/react"
import { z } from "zod"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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
afterEach(() => vi.useRealTimers())

describe("useQueryParamState", () => {
    it("should_cancel_a_pending_search_when_filter_or_history_navigation_changes_the_url", () => {
        vi.useFakeTimers()
        const { result, rerender } = renderHook(() => useQueryParamState("q", z.string(), ""))
        act(() => result.current.setValue("An", { debounceMs: 250 }))
        navigation.search = "kind=group"
        rerender()
        act(() => vi.advanceTimersByTime(300))
        expect(navigation.replace).not.toHaveBeenCalled()
    })
    it("should_clear_cursor_when_search_changes_without_losing_the_selected_chat", () => {
        navigation.search = "cursor=older&conversation=abc"
        const { result } = renderHook(() => useQueryParamState("q", z.string(), ""))
        act(() => result.current.setValue("An", { resetKeys: ["cursor"] }))
        expect(navigation.push).toHaveBeenCalledWith("/inbox?conversation=abc&q=An", { scroll: false })
    })
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
