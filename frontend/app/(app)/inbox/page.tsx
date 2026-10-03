import { EmptyState } from "@/shared/components/EmptyState"

/** Show the foundation landing view until messaging is connected. */
export default function InboxPage() {
  return <div className="grid gap-6">
    <header><p className="text-sm font-semibold uppercase tracking-widest text-[var(--brand)]">Linko</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Tin nhắn</h1></header>
    <EmptyState title="Chưa có cuộc trò chuyện" description="Các cuộc trò chuyện sẽ xuất hiện ở đây." />
  </div>
}
