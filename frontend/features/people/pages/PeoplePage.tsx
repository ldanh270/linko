"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { FRIEND_REQUEST_DIRECTION, USER_SEARCH_MODE, USER_SEARCH_QUERY_PARAMS } from "@linko/contracts"
import { useQueryParamState } from "@/shared/url/useQueryParamState"
import { acceptFriend, listFriendRequests, listFriends, openDirectChat, requestFriend, searchPeople } from "../api/people.api"
import { getPublicUser } from "@/features/profile/api/profile.api"
import { Button } from "@/shared/components/Button"
import { Input } from "@/shared/components/Input"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"

const PEOPLE_PARAMS = { USER: "user" } as const
const OPTIONAL_ID = z.string().min(1)

/** Search public profiles, handle requests, and open friends' direct chats. */
export function PeoplePage() {
  const router = useRouter()
  const client = useQueryClient()
  const [requestedIds, setRequestedIds] = useState<ReadonlySet<string>>(() => new Set())
  const { value: keyword, setValue: setKeyword } = useQueryParamState(USER_SEARCH_QUERY_PARAMS.KEYWORD, z.string(), "")
  const { value: selectedUser, setValue: setSelectedUser } = useQueryParamState(PEOPLE_PARAMS.USER, OPTIONAL_ID, "")
  const friendsQuery = useQuery({ queryKey: ["friends"], queryFn: listFriends })
  const requestsQuery = useQuery({ queryKey: ["friend-requests", FRIEND_REQUEST_DIRECTION.RECEIVED], queryFn: () => listFriendRequests(FRIEND_REQUEST_DIRECTION.RECEIVED) })
  const searchQuery = useQuery({ queryKey: ["people-search", keyword], queryFn: () => searchPeople({ keyword, type: USER_SEARCH_MODE.FULL }), enabled: keyword.trim().length >= 2 })
  const profileQuery = useQuery({ queryKey: ["public-profile", selectedUser], queryFn: () => getPublicUser(selectedUser), enabled: Boolean(selectedUser) })
  const request = useMutation({ mutationFn: requestFriend, onSuccess: (_result, input) => { setRequestedIds((current) => new Set([...current, input.recipientId])); return client.invalidateQueries({ queryKey: ["people-search", keyword] }) } })
  const accept = useMutation({ mutationFn: acceptFriend, onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ["friend-requests"] }), client.invalidateQueries({ queryKey: ["friends"] })]) })
  const openChat = useMutation({ mutationFn: openDirectChat, onSuccess: (conversation) => router.push(buildAppRoute(APP_ROUTES.DIRECT_CONVERSATION, { conversationId: conversation.id })) })
  const friends = friendsQuery.data ?? []
  const searchResults = [...new Map((searchQuery.data ?? []).map((person) => [person.id, person])).values()]
  return <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="grid content-start gap-6"><header><p className="text-sm font-semibold text-[var(--brand)]">Kết nối</p><h1 className="mt-1 text-3xl font-bold">Bạn bè</h1></header>
    <Input id="people-search" label="Tìm theo tên hoặc tên đăng nhập" value={keyword} onChange={(event) => setKeyword(event.target.value, { history: "replace", debounceMs: 250 })} />
    {keyword.trim().length >= 2 && (searchQuery.isPending ? <LoadingState label="Đang tìm kiếm" /> : searchQuery.isError ? <ErrorState title="Không thể tìm người dùng" onRetry={() => void searchQuery.refetch()} /> : searchResults.length ? <ul className="grid gap-2">{searchResults.map((person) => { const isFriend = friends.some((friend) => friend.id === person.id); const isRequested = requestedIds.has(person.id); return <li key={person.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><button type="button" onClick={() => setSelectedUser(person.id)} className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-[var(--brand)]"><span className="block truncate font-semibold">{person.displayName}</span><span className="text-sm text-[var(--text-secondary)]">@{person.username}</span></button><Button size="small" isLoading={request.isPending} disabled={isFriend || isRequested} onClick={() => request.mutate({ recipientId: person.id })}>{isFriend ? "Đã là bạn" : isRequested ? "Đã gửi" : "Kết bạn"}</Button></li> })}</ul> : <EmptyState title="Không tìm thấy ai" description="Thử tên khác hoặc tên đăng nhập." />)}
    <section className="grid gap-3"><h2 className="text-xl font-semibold">Bạn bè của bạn</h2>{friendsQuery.isPending ? <LoadingState label="Đang tải bạn bè" /> : friendsQuery.isError ? <ErrorState title="Không thể tải bạn bè" onRetry={() => void friendsQuery.refetch()} /> : friends.length ? <ul className="grid gap-2">{friends.map((friend) => <li key={friend.id} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div><p className="font-semibold">{friend.displayName}</p><p className="text-sm text-[var(--text-secondary)]">@{friend.username}</p></div><Button size="small" variant="secondary" isLoading={openChat.isPending} onClick={() => openChat.mutate(friend.id)}>Nhắn tin</Button></li>)}</ul> : <EmptyState title="Chưa có bạn bè" description="Tìm người bạn muốn kết nối ở phía trên." />}</section>
    </div><aside className="grid content-start gap-3"><h2 className="text-xl font-semibold">Lời mời kết bạn</h2>{requestsQuery.isPending ? <LoadingState label="Đang tải lời mời" /> : requestsQuery.isError ? <ErrorState title="Không thể tải lời mời" onRetry={() => void requestsQuery.refetch()} /> : requestsQuery.data?.length ? requestsQuery.data.map((item) => <article key={item.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><p className="font-semibold">{item.from.displayName}</p><p className="text-sm text-[var(--text-secondary)]">@{item.from.username}</p><Button className="mt-3 w-full" size="small" isLoading={accept.isPending} onClick={() => accept.mutate(item.id)}>Chấp nhận</Button></article>) : <EmptyState title="Không có lời mời mới" />}
      {selectedUser && <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex justify-between"><h2 className="font-semibold">Hồ sơ</h2><button type="button" onClick={() => setSelectedUser("")} aria-label="Đóng hồ sơ">×</button></div>{profileQuery.isPending ? <LoadingState label="Đang tải hồ sơ" /> : profileQuery.isError || !profileQuery.data ? <ErrorState title="Không tìm thấy hồ sơ" /> : <><p className="mt-3 font-medium">{profileQuery.data.displayName}</p><p className="text-sm text-[var(--text-secondary)]">@{profileQuery.data.username}</p><p className="mt-2 text-sm">{profileQuery.data.bio}</p></>}</section>}</aside>
  </section>
}
