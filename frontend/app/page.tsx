import { redirect } from "next/navigation"

/** Open the foundation app destination from the site root. */
export default function Home() {
  redirect("/inbox")
}
