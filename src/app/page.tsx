"use client"

import Link from "next/link"
import { ArrowRightIcon, CalculatorIcon, PackageIcon } from "lucide-react"
import { classify } from "@/lib/calc"
import { portfolioStats } from "@/lib/products"
import { ratioPercent } from "@/lib/money"
import { formatBRL, formatDate, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useStore } from "@/components/providers/store-provider"
import { EmptyState, MarketplaceName, Money, PageHeader, Pct, StatusBadge } from "@/components/app/bits"
import { buttonVariants } from "@/components/ui/button"

function Stat({ label, value, sub, tone, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string; className?: string }) {
  return (
    <div className={cn("animate-fade-up rounded-xl border bg-card p-5 transition-colors hover:border-foreground/15", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("num mt-2 text-2xl font-semibold tracking-tight", tone)}>{value}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { hydrated, products, settings } = useStore()
  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-muted/30" />

  const s = portfolioStats(products, settings)
  const avgMargin = ratioPercent(s.profit, s.revenue)
  const avgRoi = ratioPercent(s.profit, s.capital)
  const recent = [...products].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8)

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description="Resumo dos produtos salvos, considerando o marketplace principal e a quantidade de cada análise."
        actions={
          <Link href="/analise" className={buttonVariants()}>
            <CalculatorIcon data-icon="inline-start" />
            Nova análise
          </Link>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Nenhum produto analisado ainda"
          description="Analise um produto do fornecedor e salve para acompanhar capital, lucro potencial, margem e ROI por aqui."
          action={
            <Link href="/analise" className={buttonVariants()}>
              Começar primeira análise
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Lucro potencial" value={formatBRL(s.profit)} tone={s.profit >= 0 ? "text-profit" : "text-loss"} sub="Soma de lucro/un. × quantidade" className="lg:col-span-2" />
            <Stat label="Faturamento potencial" value={formatBRL(s.revenue)} sub="Preço × quantidade" />
            <Stat label="Capital necessário" value={formatBRL(s.capital)} sub="Custo real × quantidade" />
            <Stat label="Produtos analisados" value={formatNumber(s.count)} />
            <Stat label="Produtos lucrativos" value={`${formatNumber(s.profitable)}`} sub={`Margem ≥ ${formatPercent(settings.targets.minMargin)} (meta mínima)`} />
            <Stat label="Margem média" value={formatPercent(avgMargin)} sub="Ponderada: lucro ÷ faturamento" />
            <Stat label="ROI médio" value={formatPercent(avgRoi)} sub="Ponderado: lucro ÷ capital" />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Analisados recentemente</h2>
              <Link href="/produtos" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                Ver todos <ArrowRightIcon className="size-3" />
              </Link>
            </div>
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {recent.map((p) => {
                const status = classify(p.snapshot.profit, p.snapshot.margin, settings.targets)
                return (
                  <Link key={p.id} href={`/analise?id=${p.id}`} className="grid grid-cols-2 items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto]">
                    <div className="col-span-2 min-w-0 md:col-span-1">
                      <p className="truncate text-sm font-medium">{p.input.name}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <MarketplaceName id={p.marketplace} name={settings.marketplaces[p.marketplace].name} />· {formatDate(p.updatedAt)}
                      </p>
                    </div>
                    <div className="text-[13px]">
                      <p className="text-[11px] text-muted-foreground">Venda</p>
                      <Money cents={p.snapshot.salePrice} />
                    </div>
                    <div className="text-[13px]">
                      <p className="text-[11px] text-muted-foreground">Lucro/un.</p>
                      <Money cents={p.snapshot.profit} tone className="font-medium" />
                    </div>
                    <div className="text-[13px]">
                      <p className="text-[11px] text-muted-foreground">Margem · ROI</p>
                      <Pct value={p.snapshot.margin} /> · <Pct value={p.snapshot.roi} />
                    </div>
                    <StatusBadge status={status} className="justify-self-start md:justify-self-end" />
                  </Link>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
