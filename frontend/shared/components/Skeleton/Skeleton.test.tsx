import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Skeleton,
  ConversationListSkeleton,
  RecentPeopleStripSkeleton,
  MessageTimelineSkeleton,
  ConversationPaneSkeleton,
  ContactsListSkeleton,
  ProfileSidebarSkeleton,
  ProfilePageSkeleton,
  NotificationsListSkeleton,
  SettingsSidebarSkeleton,
  FriendRequestsSkeleton,
  PeoplePageSkeleton,
  AccountSummarySectionSkeleton,
} from "./index"

describe("Skeleton components", () => {
  it("renders base skeleton with pulse class and optional circle", () => {
    const { container } = render(<Skeleton circle className="w-10 h-10" />)
    const el = container.firstChild as HTMLElement
    expect(el).toHaveClass("animate-pulse")
    expect(el).toHaveClass("rounded-full")
  })

  it("renders ConversationListSkeleton with accessibility status", () => {
    render(<ConversationListSkeleton count={3} />)
    expect(screen.getByRole("status", { name: /danh sách hội thoại/i })).toBeInTheDocument()
  })

  it("renders RecentPeopleStripSkeleton with accessibility status", () => {
    render(<RecentPeopleStripSkeleton />)
    expect(screen.getByRole("status", { name: /gần đây/i })).toBeInTheDocument()
  })

  it("renders MessageTimelineSkeleton with accessibility status", () => {
    render(<MessageTimelineSkeleton />)
    expect(screen.getByRole("status", { name: /tin nhắn/i })).toBeInTheDocument()
  })

  it("renders ConversationPaneSkeleton with accessibility status", () => {
    render(<ConversationPaneSkeleton />)
    expect(screen.getByRole("status", { name: /cuộc trò chuyện/i })).toBeInTheDocument()
  })

  it("renders ContactsListSkeleton with accessibility status", () => {
    render(<ContactsListSkeleton />)
    expect(screen.getByRole("status", { name: /danh bạ/i })).toBeInTheDocument()
  })

  it("renders ProfileSidebarSkeleton with accessibility status", () => {
    render(<ProfileSidebarSkeleton />)
    expect(screen.getByRole("status", { name: /hồ sơ/i })).toBeInTheDocument()
  })

  it("renders ProfilePageSkeleton with accessibility status", () => {
    render(<ProfilePageSkeleton />)
    expect(screen.getByRole("status", { name: /hồ sơ/i })).toBeInTheDocument()
  })

  it("renders NotificationsListSkeleton with accessibility status", () => {
    render(<NotificationsListSkeleton />)
    expect(screen.getByRole("status", { name: /thông báo/i })).toBeInTheDocument()
  })

  it("renders SettingsSidebarSkeleton with accessibility status", () => {
    render(<SettingsSidebarSkeleton />)
    expect(screen.getByRole("status", { name: /cài đặt/i })).toBeInTheDocument()
  })

  it("renders FriendRequestsSkeleton with accessibility status", () => {
    render(<FriendRequestsSkeleton />)
    expect(screen.getByRole("status", { name: /lời mời kết bạn/i })).toBeInTheDocument()
  })

  it("renders PeoplePageSkeleton with accessibility status", () => {
    render(<PeoplePageSkeleton />)
    expect(screen.getByRole("status", { name: /danh bạ/i })).toBeInTheDocument()
  })

  it("renders AccountSummarySectionSkeleton with accessibility status", () => {
    render(<AccountSummarySectionSkeleton />)
    expect(screen.getByRole("status", { name: /thông tin tài khoản/i })).toBeInTheDocument()
  })
})
