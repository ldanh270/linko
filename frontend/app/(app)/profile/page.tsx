import { EmptyState } from "@/shared/components/EmptyState"

/** Show the profile destination while account features are built. */
export default function ProfilePage() {
  return <div className="grid gap-6"><h1 className="text-3xl font-bold tracking-tight">Cá nhân</h1><EmptyState title="Hồ sơ" description="Thông tin tài khoản sẽ xuất hiện ở đây." /></div>
}
