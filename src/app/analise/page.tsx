import { Suspense } from "react"
import { AnalysisPage } from "@/components/analysis/analysis-page"

export const metadata = { title: "Nova análise · Precifica Meli" }

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted/30" />}>
      <AnalysisPage />
    </Suspense>
  )
}
