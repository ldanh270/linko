import type { Metadata } from "next"
import type { ReactNode } from "react"
import { cookies } from "next/headers"
import "@fontsource/be-vietnam-pro/400.css"
import "@fontsource/be-vietnam-pro/400-italic.css"
import "@fontsource/be-vietnam-pro/500.css"
import "@fontsource/be-vietnam-pro/600.css"
import "@fontsource/be-vietnam-pro/700.css"
import { I18nProvider } from "@/shared/i18n/I18nProvider"
import { ToastProvider } from "@/shared/components/ToastProvider"
import { QueryProvider } from "@/shared/query/QueryProvider"
import { ThemeProvider } from "@/shared/theme/ThemeProvider"
import "./globals.css"

/** Linko metadata displayed by browsers and sharing surfaces. */
export const metadata: Metadata = {
  title: "Linko",
  description: "Kết nối gần hơn mỗi ngày",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

/** Mount global theme, i18n, query and notification providers with server-rendered language attribute. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const initialLang = cookieStore.get("linko_language")?.value === "en" ? "en" : "vi"

  return (
    <html lang={initialLang} suppressHydrationWarning>
      <body>
        <I18nProvider>
          <ThemeProvider>
            <QueryProvider>
              <ToastProvider>{children}</ToastProvider>
            </QueryProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
