import type { Metadata } from "next"
import { Suspense } from "react"
import { AnalysisPage } from "@/components/analysis/analysis-page"

export const metadata: Metadata = {
  title: "Nova análise de produto",
  description: "Informe custo e preço e veja na hora taxas, valor líquido, lucro, margem, ROI, preço de equilíbrio e preço ideal no Mercado Livre, Shopee e TikTok Shop.",
  alternates: { canonical: "/analise/" },
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted/30" />}>
      <AnalysisPage />
    </Suspense>
  )
}
