"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { login, signup } from "../api/auth.api"
import type { LoginInput, SignupInput } from "@linko/contracts"
import { AUTH_QUERY_PARAMS } from "../auth.constants"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { ApiError } from "@/shared/http/ApiError"
import { Button } from "@/shared/components/Button"
import { Input } from "@/shared/components/Input"
import { Link } from "@/shared/components/Link"

/** Render the account form and own its local submission state. */
export function AuthForm({ mode }: { readonly mode: "login" | "signup" }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string; email?: string; displayName?: string }>({})
  const [values, setValues] = useState({ username: "", password: "", email: "", displayName: "" })
  const isSignup = mode === "signup"

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading) return
    setError(null)
    const validation = {
      ...(values.username.trim().length < 3 ? { username: "Tên đăng nhập cần ít nhất 3 ký tự." } : {}),
      ...(values.password.length < 8 ? { password: "Mật khẩu cần ít nhất 8 ký tự." } : {}),
      ...(isSignup && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ? { email: "Nhập địa chỉ email hợp lệ." } : {}),
      ...(isSignup && !values.displayName.trim() ? { displayName: "Nhập tên hiển thị." } : {}),
    }
    setFieldErrors(validation)
    if (Object.keys(validation).length > 0) return
    setIsLoading(true)
    try {
      if (isSignup) {
        await signup(values satisfies SignupInput)
        const nextPath = readSafeNextPath()
        const query = new URLSearchParams({ [AUTH_QUERY_PARAMS.REGISTERED]: "1", ...(nextPath ? { [AUTH_QUERY_PARAMS.NEXT]: nextPath } : {}) })
        router.replace(`${APP_ROUTES.LOGIN}?${query.toString()}`)
      } else {
        await login({ username: values.username, password: values.password } satisfies LoginInput)
        await queryClient.cancelQueries()
        queryClient.clear()
        router.replace(readSafeNextPath() ?? APP_ROUTES.INBOX)
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        if (cause.code.includes("EMAIL")) setFieldErrors({ email: cause.message })
        else if (cause.code.includes("USERNAME")) setFieldErrors({ username: cause.message })
        else setError(cause.message)
      } else setError(cause instanceof ApiError ? cause.message : "Đã có lỗi xảy ra. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  return <form onSubmit={onSubmit} className="grid gap-4" noValidate>
    {isSignup && <>
      <Input id="displayName" label="Tên hiển thị" error={fieldErrors.displayName} autoComplete="name" required maxLength={80} value={values.displayName} onChange={(event) => { setFieldErrors({ ...fieldErrors, displayName: undefined }); setValues({ ...values, displayName: event.target.value }) }} />
      <Input id="email" label="Email" error={fieldErrors.email} type="email" autoComplete="email" required value={values.email} onChange={(event) => { setFieldErrors({ ...fieldErrors, email: undefined }); setValues({ ...values, email: event.target.value }) }} />
    </>}
    <Input id="username" label="Tên đăng nhập" error={fieldErrors.username} autoComplete="username" required minLength={3} maxLength={30} value={values.username} onChange={(event) => { setFieldErrors({ ...fieldErrors, username: undefined }); setValues({ ...values, username: event.target.value }) }} />
    <Input id="password" label="Mật khẩu" error={fieldErrors.password} type="password" autoComplete={isSignup ? "new-password" : "current-password"} required minLength={8} value={values.password} onChange={(event) => { setFieldErrors({ ...fieldErrors, password: undefined }); setValues({ ...values, password: event.target.value }) }} />
    {isSignup && <p className="-mt-3 text-xs text-[var(--text-secondary)]">Mật khẩu cần có ít nhất 8 ký tự.</p>}
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    <Button type="submit" isLoading={isLoading} className="mt-2 w-full">{isSignup ? "Tạo tài khoản" : "Đăng nhập"}</Button>
    <p className="text-center text-sm text-[var(--text-secondary)]">
      {isSignup ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
      <Link href={isSignup ? APP_ROUTES.LOGIN : APP_ROUTES.SIGNUP}>{isSignup ? "Đăng nhập" : "Đăng ký"}</Link>
    </p>
  </form>
}

function readSafeNextPath(): string | null {
  if (typeof window === "undefined") return null
  const nextPath = new URLSearchParams(window.location.search).get(AUTH_QUERY_PARAMS.NEXT)
  return nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null
}
