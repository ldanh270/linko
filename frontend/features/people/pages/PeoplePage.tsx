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
import { Avatar } from "@/shared/components/Avatar"
import { PageHeader } from "@/shared/components/PageHeader"
import { SurfacePanel } from "@/shared/components/SurfacePanel"

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
  return <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="grid content-start gap-6"><PageHeader eyebrow="Kết nối" title="Bạn bè" />
    <Input id="people-search" label="Tìm theo tên hoặc tên đăng nhập" value={keyword} onChange={(event) => setKeyword(event.target.value, { history: "replace", debounceMs: 250 })} />
    {keyword.trim().length >= 2 && (searchQuery.isPending ? <LoadingState label="Đang tìm kiếm" /> : searchQuery.isError ? <ErrorState title="Không thể tìm người dùng" onRetry={() => void searchQuery.refetch()} /> : searchResults.length ? <ul className="grid gap-2">{searchResults.map((person) => { const isFriend = friends.some((friend) => friend.id === person.id); const isRequested = requestedIds.has(person.id); return <li key={person.id} className="surface-panel flex items-center gap-3 p-3 sm:gap-4 sm:p-4"><Avatar label={person.displayName} /><button type="button" onClick={() => setSelectedUser(person.id)} className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-[var(--brand)]"><span className="block truncate font-semibold">{person.displayName}</span><span className="text-sm text-[var(--text-secondary)]">@{person.username}</span></button><Button size="small" isLoading={request.isPending} disabled={isFriend || isRequested} onClick={() => request.mutate({ recipientId: person.id })}>{isFriend ? "Đã là bạn" : isRequested ? "Đã gửi" : "Kết bạn"}</Button></li> })}</ul> : <EmptyState title="Không tìm thấy ai" description="Thử tên khác hoặc tên đăng nhập." />)}
    <section className="grid gap-3"><h2 className="text-xl font-semibold">Bạn bè của bạn</h2>{friendsQuery.isPending ? <LoadingState label="Đang tải bạn bè" /> : friendsQuery.isError ? <ErrorState title="Không thể tải bạn bè" onRetry={() => void friendsQuery.refetch()} /> : friends.length ? <ul className="grid gap-2">{friends.map((friend) => <li key={friend.id} className="surface-panel flex items-center justify-between gap-3 p-3 sm:gap-4 sm:p-4"><div className="flex min-w-0 items-center gap-3"><Avatar label={friend.displayName} /><div className="min-w-0"><p className="truncate font-semibold">{friend.displayName}</p><p className="truncate text-sm text-[var(--text-secondary)]">@{friend.username}</p></div></div><Button size="small" variant="secondary" isLoading={openChat.isPending} onClick={() => openChat.mutate(friend.id)}>Nhắn tin</Button></li>)}</ul> : <EmptyState title="Chưa có bạn bè" description="Tìm người bạn muốn kết nối ở phía trên." />}</section>
    </div><aside className="grid content-start gap-3"><h2 className="text-xl font-semibold">Lời mời kết bạn</h2>{requestsQuery.isPending ? <LoadingState label="Đang tải lời mời" /> : requestsQuery.isError ? <ErrorState title="Không thể tải lời mời" onRetry={() => void requestsQuery.refetch()} /> : requestsQuery.data?.length ? requestsQuery.data.map((item) => <SurfacePanel key={item.id} className="p-4"><div className="flex items-center gap-3"><Avatar label={item.from.displayName} /><div><p className="font-semibold">{item.from.displayName}</p><p className="text-sm text-[var(--text-secondary)]">@{item.from.username}</p></div></div><Button className="mt-3 w-full" size="small" isLoading={accept.isPending} onClick={() => accept.mutate(item.id)}>Chấp nhận</Button></SurfacePanel>) : <EmptyState title="Không có lời mời mới" />}
      {selectedUser && <SurfacePanel className="p-4"><div className="flex justify-between"><h2 className="font-semibold">Hồ sơ</h2><button type="button" onClick={() => setSelectedUser("")} aria-label="Đóng hồ sơ" className="h-11 w-11 rounded-lg text-2xl text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]">×</button></div>{profileQuery.isPending ? <LoadingState label="Đang tải hồ sơ" /> : profileQuery.isError || !profileQuery.data ? <ErrorState title="Không tìm thấy hồ sơ" /> : <><div className="mt-3 flex items-center gap-3"><Avatar label={profileQuery.data.displayName} size="large" /><div><p className="font-semibold">{profileQuery.data.displayName}</p><p className="text-sm text-[var(--text-secondary)]">@{profileQuery.data.username}</p></div></div><p className="mt-3 text-sm text-[var(--text-secondary)]">{profileQuery.data.bio}</p></>}</SurfacePanel>}</aside>
  </section>
}
