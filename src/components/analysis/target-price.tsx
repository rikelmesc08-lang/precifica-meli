"use client"

import * as React from "react"
import { CrosshairIcon, TriangleAlertIcon } from "lucide-react"
import { MARKETPLACE_IDS, type MarketplaceId } from "@/types"
import { solvePrice, type PriceTarget, type SaleContext } from "@/lib/calc"
import { toCents } from "@/lib/money"
import { formatBRL } from "@/lib/format"
import { Field, MarketplaceName, Money, Pct, Segmented } from "@/components/app/bits"
import { NumberField } from "@/components/app/number-field"

type Mode = "margin" | "profit"

/**
 * "Qual preço devo vender?" e calculadora reversa.
 * Resolve o preço considerando comissões percentuais, tarifas fixas, faixas
 * de preço, tetos, imposto e publicidade — não é custo + %.
 */
export function TargetPrice({ contexts, defaultMargin }: { contexts: Record<MarketplaceId, SaleContext>; defaultMargin: number }) {
  const [mode, setMode] = React.useState<Mode>("margin")
  const [margin, setMargin] = React.useState<number | null>(defaultMargin)
  const [profit, setProfit] = React.useState<number | null>(20)

  const target: PriceTarget | null =
    mode === "margin" ? (margin !== null ? { type: "margin", percent: margin } : null) : profit !== null ? { type: "profit", cents: toCents(profit) } : null

  const unitCost = contexts.mercadolivre.unitCost.total

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-end">
        <Field label="Quero atingir" className="sm:w-80">
          <Segmented
            value={mode}
            onChange={setMode}
            className="w-full"
            options={[
              { value: "margin", label: "Margem líquida" },
              { value: "profit", label: "Lucro por unidade" },
            ]}
          />
        </Field>
        {mode === "margin" ? (
          <Field label="Margem líquida desejada" className="sm:w-48">
            <NumberField value={margin} onChange={setMargin} suffix="%" aria-label="Margem desejada" />
          </Field>
        ) : (
          <Field label="Lucro líquido desejado por unidade" className="sm:w-56">
            <NumberField value={profit} onChange={setProfit} prefix="R$" aria-label="Lucro desejado" />
          </Field>
        )}
        <p className="text-xs leading-relaxed text-muted-foreground sm:flex-1 sm:pb-2">
          Custo real considerado: <span className="num text-foreground">{formatBRL(unitCost)}</span>.{" "}
          {mode === "margin" ? "Margem = lucro ÷ preço de venda (não é markup sobre o custo)." : "Lucro depois de todas as taxas, imposto e publicidade ativos."}
        </p>
      </div>

      {unitCost <= 0 ? (
        <p className="text-sm text-muted-foreground">Informe o custo do produto no formulário para calcular o preço.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1 wide:grid-cols-3">
          {MARKETPLACE_IDS.map((id, i) => {
            const res = target ? solvePrice(contexts[id], target) : null
            const be = solvePrice(contexts[id], { type: "breakeven" })
            return (
              <div key={id} className="animate-fade-up rounded-xl border bg-card p-5" style={{ animationDelay: `${i * 60}ms` }}>
                <MarketplaceName id={id} className="text-sm font-medium" />
                {res?.price != null && res.result ? (
                  <>
                    <p className="mt-4 text-xs text-muted-foreground">Preço necessário</p>
                    <p className="num mt-1 text-3xl font-semibold tracking-tight">{formatBRL(res.price)}</p>
                    <dl className="mt-4 space-y-1.5 text-[13px]">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Taxas da plataforma</dt>
                        <dd className="num">-{formatBRL(res.result.totalFees)}</dd>
                      </div>
                      {res.result.tax + res.result.ads > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Imposto + publicidade</dt>
                          <dd className="num">-{formatBRL(res.result.tax + res.result.ads)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Lucro líquido</dt>
                        <dd>
                          <Money cents={res.result.profit} tone />
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Margem · ROI</dt>
                        <dd className="num">
                          <Pct value={res.result.margin} /> · <Pct value={res.result.roi} />
                        </dd>
                      </div>
                    </dl>
                    {res.nextBreakpoint !== null && res.nextBreakpoint - res.price <= Math.max(1000, res.price * 0.15) && (
                      <p className="mt-3 flex gap-2 rounded-lg bg-warn/10 px-3 py-2 text-[11px] leading-relaxed text-warn">
                        <TriangleAlertIcon className="mt-0.5 size-3 shrink-0" />A partir de {formatBRL(res.nextBreakpoint)} as tarifas mudam de faixa. Compare antes de arredondar o preço.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-4 flex gap-2 text-sm text-muted-foreground">
                    <CrosshairIcon className="mt-0.5 size-4 shrink-0" />
                    {res?.reason ?? "Informe o objetivo."}
                  </p>
                )}
                <p className="mt-4 border-t border-dashed pt-3 text-[11px] text-muted-foreground">
                  Equilíbrio (lucro zero): <span className="num text-foreground">{be.price !== null ? formatBRL(be.price) : "—"}</span>
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
