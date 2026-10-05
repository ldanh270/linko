import { Link } from "@/shared/components/Link"

/** Present Linko's private-group value proposition and its two account actions. */
export function WelcomeHero() {
  return <section className="mx-auto grid w-full max-w-6xl items-center gap-12 py-16 md:grid-cols-[1.1fr_.9fr] md:py-24">
    <div className="max-w-2xl"><p className="mb-5 inline-flex rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-semibold text-[var(--brand)]">Nơi những nhóm bạn gần nhau hơn</p><h1 className="text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">Chuyện hay bắt đầu từ <span className="text-[var(--brand)]">một cuộc trò chuyện.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-[var(--text-secondary)]">Tạo không gian riêng cho nhóm bạn, cùng chia sẻ ý tưởng và giữ những khoảnh khắc đáng nhớ ở một nơi.</p><WelcomeActions /></div>
    <div aria-hidden="true" className="mx-auto grid w-full max-w-md gap-4 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl shadow-indigo-950/5"><div className="flex items-center gap-3 border-b border-[var(--border)] pb-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand-soft)] text-xl">✦</span><div><p className="font-semibold">Nhóm đọc sách</p><p className="text-sm text-[var(--text-secondary)]">8 thành viên · 3 tin mới</p></div></div><div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[var(--surface-subtle)] p-4 text-sm">Cuối tuần này mình đọc tiếp chương 4 nhé 📚</div><div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[var(--brand-soft)] p-4 text-sm">Đúng cuốn đang hay nhất luôn!</div><div className="h-12 rounded-xl border border-[var(--border)] bg-[var(--background)]" /></div>
  </section>
}

function WelcomeActions() {
  return <div className="mt-9 flex flex-wrap gap-3"><Link href="/signup" className="rounded-xl bg-[var(--brand)] px-5 py-3 font-semibold text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)]">Tạo tài khoản miễn phí</Link><Link href="/login" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 font-semibold">Tôi đã có tài khoản</Link></div>
}
