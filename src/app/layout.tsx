import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { StoreProvider } from "@/components/providers/store-provider"
import { AppShell } from "@/components/app/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Precifica Meli · Análise de produtos para marketplaces",
  description: "Calcule custo real, taxas, lucro, margem, ROI e preço ideal no Mercado Livre, Shopee e TikTok Shop.",
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
