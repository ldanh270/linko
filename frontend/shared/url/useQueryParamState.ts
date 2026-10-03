"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"
import type { ZodType } from "zod"

import { QUERY_PARAMS } from "./url.constants"

/** Controls how a query parameter change enters browser history. */
export interface QueryParamChange {
    history?: "push" | "replace"
    debounceMs?: number
    resetPage?: boolean
}

/** Keep validated filter state in the URL so refresh and back restore the view. */
export function useQueryParamState<T extends string | number | boolean>(
    key: string,
    schema: ZodType<T>,
    defaultValue: T,
) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const rawValue = searchParams.get(key)
    const parsed = rawValue === null ? null : schema.safeParse(rawValue)
    const value = parsed?.success ? parsed.data : defaultValue

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current)
    }, [])

    const setValue = useCallback((nextValue: T, change: QueryParamChange = {}) => {
        const params = new URLSearchParams(searchParams.toString())
        if (String(nextValue) === String(defaultValue)) params.delete(key)
        else params.set(key, String(nextValue))
        if (change.resetPage !== false && key !== QUERY_PARAMS.PAGE) params.delete(QUERY_PARAMS.PAGE)
        const query = params.toString()
        const url = query ? `${pathname}?${query}` : pathname
        const navigate = () => {
            if (change.history === "replace" || change.debounceMs) router.replace(url, { scroll: false })
            else router.push(url, { scroll: false })
        }
        if (timer.current) clearTimeout(timer.current)
        if (change.debounceMs) timer.current = setTimeout(navigate, change.debounceMs)
        else navigate()
    }, [defaultValue, key, pathname, router, searchParams])

    return { value, setValue }
}
