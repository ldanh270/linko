import type { Metadata } from "next"
import type { ReactNode } from "react"
import "@fontsource/be-vietnam-pro/400.css"
import "@fontsource/be-vietnam-pro/500.css"
import "@fontsource/be-vietnam-pro/600.css"
import "@fontsource/be-vietnam-pro/700.css"
import { ToastProvider } from "@/shared/components/ToastProvider"
import { QueryProvider } from "@/shared/query/QueryProvider"
import { ThemeProvider } from "@/shared/theme/ThemeProvider"
import "./globals.css"

/** Linko metadata displayed by browsers and sharing surfaces. */
export const metadata: Metadata = { title: "Linko", description: "Kết nối gần hơn mỗi ngày" }

/** Mount global theme, query and notification providers once. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="vi" suppressHydrationWarning><body><ThemeProvider><QueryProvider><ToastProvider>{children}</ToastProvider></QueryProvider></ThemeProvider></body></html>
}
