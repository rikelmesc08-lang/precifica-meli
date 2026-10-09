import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { StoreProvider } from "@/components/providers/store-provider"
import { AppShell } from "@/components/app/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/config/site"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Precifica Meli · Calculadora de lucro para Mercado Livre, Shopee e TikTok Shop",
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["calculadora Mercado Livre", "taxas Shopee", "TikTok Shop taxas", "margem de lucro", "preço de venda", "ROI", "marketplace"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: SITE_NAME,
    title: "Precifica Meli · Calculadora de lucro para marketplaces",
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary", title: "Precifica Meli · Calculadora de lucro para marketplaces", description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: "#121317",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <StoreProvider>
          <TooltipProvider delay={200}>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
          <Toaster theme="dark" position="bottom-right" />
        </StoreProvider>
      </body>
    </html>
  )
}
