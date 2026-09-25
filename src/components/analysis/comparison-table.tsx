"use client"

import { MARKETPLACE_IDS, type MarketplaceId } from "@/types"
import { highlights as computeHighlights, type SaleResult } from "@/lib/calc"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"
import { MarketplaceName, Money, Pct } from "@/components/app/bits"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const HL_LABEL = { maxProfit: "Maior lucro líquido", maxMargin: "Maior margem", maxRoi: "Maior ROI", minFees: "Menor total de taxas" } as const

export function highlightLabels(results: Record<MarketplaceId, SaleResult>): Record<MarketplaceId, string[]> {
  const out: Record<MarketplaceId, string[]> = { mercadolivre: [], shopee: [], tiktok: [] }
  // Sem preço não há o que destacar.
  if (MARKETPLACE_IDS.every((id) => results[id].price <= 0)) return out
  const h = computeHighlights(results)
  ;(Object.keys(HL_LABEL) as (keyof typeof HL_LABEL)[]).forEach((k) => {
    // Empate entre todos não é destaque.
    if (h[k].length === MARKETPLACE_IDS.length) return
    h[k].forEach((id) => out[id].push(HL_LABEL[k]))
  })
  return out
}

function Mark({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1.5", on && "rounded-md bg-foreground/[0.07] px-1.5 py-0.5 ring-1 ring-foreground/15 ring-inset")}>{children}</span>
}

export function ComparisonTable({ results }: { results: Record<MarketplaceId, SaleResult> }) {
  const h = computeHighlights(results)
  const any = MARKETPLACE_IDS.some((id) => results[id].price > 0)
  const on = (k: keyof typeof h, id: MarketplaceId) => any && h[k].includes(id) && h[k].length < MARKETPLACE_IDS.length
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Marketplace", "Venda", "Taxas", "Recebo", "Lucro", "Margem", "ROI"].map((h, i) => (
                <TableHead key={h} className={cn("h-10 text-[11px] font-medium tracking-wide text-muted-foreground uppercase", i > 0 && "text-right", i === 0 && "pl-5")}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MARKETPLACE_IDS.map((id) => {
              const r = results[id]
              return (
                <TableRow key={id}>
                  <TableCell className="py-3.5 pl-5 font-medium">
                    <MarketplaceName id={id} />
                  </TableCell>
                  <TableCell className="num text-right">{formatBRL(r.price)}</TableCell>
                  <TableCell className="text-right">
                    <Mark on={on("minFees", id)}>
                      <span className="num">-{formatBRL(r.totalFees)}</span>
                    </Mark>
                  </TableCell>
                  <TableCell className="num text-right">{formatBRL(r.netReceived)}</TableCell>
                  <TableCell className="text-right font-medium">
                    <Mark on={on("maxProfit", id)}>
                      <Money cents={r.profit} tone />
                    </Mark>
                  </TableCell>
                  <TableCell className="text-right">
                    <Mark on={on("maxMargin", id)}>
                      <Pct value={r.margin} />
                    </Mark>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Mark on={on("maxRoi", id)}>
                      <Pct value={r.roi} />
                    </Mark>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {any && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(HL_LABEL) as (keyof typeof HL_LABEL)[]).map((k) => (
            <div key={k} className="rounded-lg border bg-card px-4 py-3">
              <p className="text-[11px] text-muted-foreground">{HL_LABEL[k]}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium">
                {h[k].length === MARKETPLACE_IDS.length ? (
                  <span className="text-muted-foreground">Empate entre os três</span>
                ) : (
                  h[k].map((id) => <MarketplaceName key={id} id={id} />)
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Os destaques mostram cada indicador separadamente. Nenhuma plataforma é declarada “melhor”: a decisão considera volume, estratégia e risco.
      </p>
    </div>
  )
}
