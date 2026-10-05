"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { createGroup } from "../api/groups.api"
import { Button } from "@/shared/components/Button"
import { Input } from "@/shared/components/Input"
import { ApiError } from "@/shared/http/ApiError"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"

/** Create a private group and open its invitation management screen. */
export function CreateGroupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [avatar, setAvatar] = useState<File | undefined>()
  const mutation = useMutation({ mutationFn: createGroup, onSuccess: (group) => router.replace(buildAppRoute(APP_ROUTES.GROUP_INVITATIONS, { conversationId: group.id })) })
  const onSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (name.trim()) mutation.mutate({ name: name.trim(), description: description.trim() || undefined, avatar }) }
  return <section className="mx-auto grid max-w-2xl gap-6"><header><p className="text-sm font-semibold text-[var(--brand)]">Bắt đầu cùng nhau</p><h1 className="mt-1 text-3xl font-bold">Tạo nhóm mới</h1><p className="mt-2 text-[var(--text-secondary)]">Nhóm của bạn riêng tư. Bạn có thể mời mọi người sau khi tạo.</p></header>
    <form onSubmit={onSubmit} className="grid gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <Input id="group-name" label="Tên nhóm" required minLength={1} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
      <div className="grid gap-1.5"><label htmlFor="group-description" className="text-sm font-medium">Mô tả <span className="text-[var(--text-secondary)]">(không bắt buộc)</span></label><textarea id="group-description" maxLength={500} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus-visible:outline-2 focus-visible:outline-[var(--brand)]" /></div>
      <div className="grid gap-1.5"><label htmlFor="group-avatar" className="text-sm font-medium">Ảnh nhóm <span className="text-[var(--text-secondary)]">(không bắt buộc)</span></label><input id="group-avatar" type="file" accept="image/*" onChange={(event) => setAvatar(event.target.files?.[0])} className="min-h-11 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-soft)] file:px-3 file:py-2 file:font-medium file:text-[var(--brand)]" /></div>
      {mutation.error && <p role="alert" className="text-sm text-[var(--danger)]">{mutation.error instanceof ApiError ? mutation.error.message : "Không thể tạo nhóm. Vui lòng thử lại."}</p>}
      <Button type="submit" isLoading={mutation.isPending} disabled={!name.trim()}>Tạo nhóm</Button>
    </form>
  </section>
}
