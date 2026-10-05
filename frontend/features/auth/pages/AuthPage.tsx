import { AuthForm } from "../components/AuthForm"
import { Link } from "@/shared/components/Link"

/** Present the sign-in or account-creation experience. */
export function AuthPage({ mode, isRegistered = false }: { readonly mode: "login" | "signup"; readonly isRegistered?: boolean }) {
  const isSignup = mode === "signup"
  return <main className="grid min-h-dvh place-items-center px-4 py-10">
    <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm sm:p-10">
      <Link href="/" className="text-2xl font-bold tracking-tight text-[var(--brand)]">linko<span className="text-[var(--text-primary)]">.</span></Link>
      <h1 className="mt-8 text-3xl font-bold tracking-tight">{isSignup ? "Tạo tài khoản" : "Chào mừng trở lại"}</h1>
      <p className="mb-7 mt-2 text-[var(--text-secondary)]">{isSignup ? "Bắt đầu kết nối với những người bạn yêu quý." : "Đăng nhập để tiếp tục cuộc trò chuyện."}</p>
      {isRegistered && !isSignup && <p role="status" className="mb-5 rounded-xl bg-[var(--positive)]/10 p-3 text-sm text-[var(--positive)]">Tài khoản đã được tạo. Hãy đăng nhập để tiếp tục.</p>}
      <AuthForm mode={mode} />
    </section>
  </main>
}
