"use client"

import * as React from "react"
import { MARKETPLACE_IDS, type MarketplaceId } from "@/types"
import { computeSale, priceRange, type SaleContext } from "@/lib/calc"
import { toCents, toReais } from "@/lib/money"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Field, MarketplaceName, Money, Pct } from "@/components/app/bits"
import { NumberField } from "@/components/app/number-field"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/** Sugere uma faixa inicial em preços "psicológicos" (x9,90) a partir do custo. */
function suggestStart(unitCost: number): number {
  if (unitCost <= 0) return 29.9
  const base = Math.ceil((unitCost * 1.4) / 5) * 5
  return Math.max(9.9, base - 0.1)
}

export function PriceSimulator({ contexts }: { contexts: Record<MarketplaceId, SaleContext> }) {
  const unitCost = toReais(contexts.mercadolivre.unitCost.total)
  const [start, setStart] = React.useState<number | null>(null)
  const [end, setEnd] = React.useState<number | null>(null)
  const [step, setStep] = React.useState<number | null>(5)

  const s = start ?? suggestStart(unitCost)
  const e = end ?? s + 30
  const prices = priceRange(toCents(s), toCents(e), toCents(step ?? 0), 120)

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-4">
        <Field label="Preço inicial">
          <NumberField value={s} onChange={setStart} prefix="R$" />
        </Field>
        <Field label="Preço final">
          <NumberField value={e} onChange={setEnd} prefix="R$" />
        </Field>
        <Field label="Intervalo" hint="Máx. 120 linhas">
          <NumberField value={step} onChange={setStep} prefix="R$" />
        </Field>
        <p className="self-center text-xs leading-relaxed text-muted-foreground">
          Custo real: <span className="num text-foreground">{formatBRL(toCents(unitCost))}</span>. Cada linha usa as taxas da faixa correspondente ao preço.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead rowSpan={2} className="pl-5 align-bottom text-[11px] tracking-wide text-muted-foreground uppercase">
                Preço
              </TableHead>
              {MARKETPLACE_IDS.map((id) => (
                <TableHead key={id} colSpan={3} className="h-9 border-l text-center text-xs font-medium">
                  <MarketplaceName id={id} className="justify-center" />
                </TableHead>
              ))}
            </TableRow>
            <TableRow className="hover:bg-transparent">
              {MARKETPLACE_IDS.flatMap((id) =>
                ["Lucro", "Margem", "ROI"].map((h, i) => (
                  <TableHead key={id + h} className={cn("h-8 text-right text-[10.5px] tracking-wide text-muted-foreground uppercase", i === 0 && "border-l")}>
                    {h}
                  </TableHead>
                )),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.map((p) => (
              <TableRow key={p}>
                <TableCell className="num pl-5 font-medium">{formatBRL(p)}</TableCell>
                {MARKETPLACE_IDS.map((id) => {
                  const r = computeSale(contexts[id], p)
                  return (
                    <React.Fragment key={id}>
                      <TableCell className="border-l text-right">
                        <Money cents={r.profit} tone />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        <Pct value={r.margin} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        <Pct value={r.roi} />
                      </TableCell>
                    </React.Fragment>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
