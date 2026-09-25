"use client"

import * as React from "react"
import { MARKETPLACE_IDS, type MarketplaceId } from "@/types"
import { computeSale, type SaleContext } from "@/lib/calc"
import { ratioPercent, toCents } from "@/lib/money"
import { formatNumber } from "@/lib/format"
import { Field, MarketplaceName, Money, Pct } from "@/components/app/bits"
import { NumberField } from "@/components/app/number-field"

const NAMES = [
  { key: "conservador", label: "Conservador" },
  { key: "base", label: "Base" },
  { key: "otimista", label: "Otimista" },
] as const

type Key = (typeof NAMES)[number]["key"]

export function Scenarios({ contexts, basePrice, baseQuantity }: { contexts: Record<MarketplaceId, SaleContext>; basePrice: number; baseQuantity: number }) {
  const [prices, setPrices] = React.useState<Record<Key, number | null>>({ conservador: null, base: null, otimista: null })
  const [qty, setQty] = React.useState<number | null>(null)

  const defaults: Record<Key, number> = {
    conservador: Math.max(0, basePrice - 10),
    base: basePrice,
    otimista: basePrice + 10,
  }
  const quantity = Math.max(1, qty ?? baseQuantity)
  const unitCost = contexts.mercadolivre.unitCost.total

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-4">
        {NAMES.map((n) => (
          <Field key={n.key} label={`Preço ${n.label.toLowerCase()}`}>
            <NumberField value={prices[n.key] ?? defaults[n.key]} onChange={(v) => setPrices((p) => ({ ...p, [n.key]: v }))} prefix="R$" />
          </Field>
        ))}
        <Field label="Unidades vendidas" hint="Para faturamento e lucro totais">
          <NumberField value={quantity} onChange={setQty} decimals={0} suffix="un." />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1 wide:grid-cols-3">
        {NAMES.map((n, i) => {
          const price = toCents(prices[n.key] ?? defaults[n.key])
          return (
            <div key={n.key} className="animate-fade-up rounded-xl border bg-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-baseline justify-between border-b px-5 py-3.5">
                <p className="text-sm font-medium">{n.label}</p>
                <p className="num text-sm text-muted-foreground">
                  <Money cents={price} /> × {formatNumber(quantity)}
                </p>
              </div>
              <div className="divide-y">
                {MARKETPLACE_IDS.map((id) => {
                  const r = computeSale(contexts[id], price)
                  const revenue = price * quantity
                  const profit = r.profit * quantity
                  return (
                    <div key={id} className="px-5 py-3.5">
                      <MarketplaceName id={id} className="text-xs text-muted-foreground" />
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                        <span className="text-muted-foreground">Faturamento</span>
                        <Money cents={revenue} className="text-right" />
                        <span className="text-muted-foreground">Lucro total</span>
                        <Money cents={profit} tone className="text-right font-medium" />
                        <span className="text-muted-foreground">Margem · ROI</span>
                        <span className="num text-right">
                          <Pct value={ratioPercent(profit, revenue)} /> · <Pct value={ratioPercent(profit, unitCost * quantity)} />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
