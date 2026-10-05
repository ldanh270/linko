import { AuthPage } from "@/features/auth/pages/AuthPage"

/** Render the account sign-in route. */
export default async function LoginPage({ searchParams }: { readonly searchParams: Promise<{ readonly registered?: string }> }) {
  const params = await searchParams
  return <AuthPage mode="login" isRegistered={params.registered === "1"} />
}
