"use client"

import { ReceiptTextIcon, ScaleIcon, TriangleAlertIcon } from "lucide-react"
import type { AdsSettings, MarketplaceId, TargetSettings, TaxSettings } from "@/types"
import { classify, type SaleResult, type SolveResult } from "@/lib/calc"
import { formatBRL, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import { MarketplaceName, Money, Pct, StatusBadge } from "@/components/app/bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SaleBreakdown } from "./sale-breakdown"

function Line({ label, value, strong, negative }: { label: string; value: number; strong?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-[13px]">
      <span className={cn("text-muted-foreground", strong && "text-foreground")}>{label}</span>
      <span className={cn("num", strong && "font-medium")}>{negative && value > 0 ? "-" : ""}{formatBRL(value)}</span>
    </div>
  )
}

export function MarketplaceCard({
  id,
  sale,
  breakeven,
  targets,
  tax,
  ads,
  highlights = [],
  index = 0,
}: {
  id: MarketplaceId
  sale: SaleResult
  breakeven: SolveResult
  targets: TargetSettings
  tax: TaxSettings
  ads: AdsSettings
  highlights?: string[]
  index?: number
}) {
  const status = classify(sale.profit, sale.margin, targets)
  const hasPrice = sale.price > 0
  return (
    <article className="animate-fade-up flex flex-col rounded-xl border bg-card transition-colors hover:border-foreground/15" style={{ animationDelay: `${index * 60}ms` }}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3.5">
        <MarketplaceName id={id} className="text-sm font-medium whitespace-nowrap" />
        {hasPrice && <StatusBadge status={status} />}
      </header>

      <div className="px-4 pt-5">
        <p className="text-xs text-muted-foreground">Lucro líquido por unidade</p>
        <p className="mt-1 text-[1.7rem] leading-tight font-semibold tracking-tight">
          <Money cents={sale.profit} tone />
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Margem</p>
            <Pct value={sale.margin} tone className="text-sm font-medium" />
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">ROI</p>
            <Pct value={sale.roi} tone className="text-sm font-medium" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap content-start gap-1 px-4 empty:hidden md:min-h-[46px] md:empty:flex">
        {highlights.map((h) => (
          <span key={h} className="h-fit rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-foreground/80 ring-1 ring-foreground/10 ring-inset">
            {h}
          </span>
        ))}
      </div>

      <div className="mt-1 flex-1 px-4">
        <Line label="Preço de venda" value={sale.price} strong />
        <Line label="Custo real do produto" value={sale.unitCost.total} negative />
        <div className="my-1.5 border-t border-dashed" />
        <Line label="Comissão" value={sale.commission} negative />
        <Line label="Tarifas fixas" value={sale.fixedFees} negative />
        <Line label="Logística / frete" value={sale.logistics} negative />
        <Line label="Outras taxas" value={sale.otherFees} negative />
        <div className="flex items-center justify-between py-1 text-[13px]">
          <span className="text-foreground">Total de taxas</span>
          <span className="num font-medium">
            -{formatBRL(sale.totalFees)} <span className="text-[11px] font-normal text-muted-foreground">({formatPercent(sale.feesPercent)})</span>
          </span>
        </div>
        <Line label="Valor líquido recebido" value={sale.netReceived} strong />
        {(tax.enabled || ads.enabled) && <div className="my-1.5 border-t border-dashed" />}
        {tax.enabled && <Line label={`Impostos (${formatPercent(tax.percent)})`} value={sale.tax} negative />}
        {ads.enabled && <Line label="Publicidade" value={sale.ads} negative />}
      </div>

      <div className="mx-4 mt-4 flex items-start gap-2.5 rounded-lg border border-dashed px-3 py-2.5">
        <ScaleIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {breakeven.price !== null ? (
            <>
              Você precisa vender por pelo menos <span className="num font-medium text-foreground">{formatBRL(breakeven.price)}</span> para não ter prejuízo.
            </>
          ) : (
            breakeven.reason
          )}
        </p>
      </div>

      {sale.warnings.map((w) => (
        <p key={w} className="mx-4 mt-2 flex items-start gap-2 text-[11px] text-warn">
          <TriangleAlertIcon className="mt-0.5 size-3 shrink-0" />
          {w}
        </p>
      ))}

      <footer className="mt-4 border-t px-4 py-3">
        <Dialog>
          <DialogTrigger render={<Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground" />}>
            <ReceiptTextIcon data-icon="inline-start" />
            Ver cálculo
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>
                <MarketplaceName id={id} /> · detalhamento do cálculo
              </DialogTitle>
              <DialogDescription>Todos os valores por unidade, na ordem em que são descontados.</DialogDescription>
            </DialogHeader>
            <SaleBreakdown sale={sale} tax={tax} ads={ads} />
          </DialogContent>
        </Dialog>
      </footer>
    </article>
  )
}
