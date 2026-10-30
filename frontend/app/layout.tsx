import type { Metadata } from "next"
import type { ReactNode } from "react"
import "@fontsource/be-vietnam-pro/400.css"
import "@fontsource/be-vietnam-pro/500.css"
import "@fontsource/be-vietnam-pro/600.css"
import "@fontsource/be-vietnam-pro/700.css"
import { I18nProvider } from "@/shared/i18n/I18nProvider"
import { ToastProvider } from "@/shared/components/ToastProvider"
import { QueryProvider } from "@/shared/query/QueryProvider"
import { ThemeProvider } from "@/shared/theme/ThemeProvider"
import "./globals.css"

/** Linko metadata displayed by browsers and sharing surfaces. */
export const metadata: Metadata = { title: "Linko", description: "Kết nối gần hơn mỗi ngày" }

/** Mount global theme, i18n, query and notification providers once. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
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
