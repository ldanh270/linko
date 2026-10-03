import { EmptyState } from "@/shared/components/EmptyState"

/** Show the groups destination while group features are built. */
export default function GroupsPage() {
  return <div className="grid gap-6"><h1 className="text-3xl font-bold tracking-tight">Nhóm</h1><EmptyState title="Chưa có nhóm" description="Các nhóm của bạn sẽ xuất hiện ở đây." /></div>
}
