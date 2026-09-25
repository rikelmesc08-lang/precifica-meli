"use client"

import * as React from "react"
import { MARKETPLACE_IDS, type MarketplaceSelection } from "@/types"
import { computeLotCosts, computeLotForMarketplace, type LotInput } from "@/lib/calc"
import { toReais } from "@/lib/money"
import { formatBRL, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useStore } from "@/components/providers/store-provider"
import { Field, MarketplaceName, Money, PageHeader, Pct, Segmented } from "@/components/app/bits"
import { NumberField } from "@/components/app/number-field"
import { AppSelect } from "@/components/app/app-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const PROJECTION = [10, 50, 100, 500]

export default function LotPage() {
  const { hydrated, settings } = useStore()
  const [lot, setLot] = React.useState<LotInput>({ quantity: 100, unitPrice: 18, freightTotal: 240, packagingUnit: 0.8, otherUnit: 0, salePrice: 49.9, weightKg: null })
  const [mlSel, setMlSel] = React.useState<MarketplaceSelection>({})
  const [freightMode, setFreightMode] = React.useState<"unit" | "total">("unit")

  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-muted/30" />

  const set = (k: keyof LotInput) => (v: number | null) => setLot((l) => ({ ...l, [k]: k === "weightKg" ? v : (v ?? 0) }))
  const cc = settings.marketplaces.mercadolivre.categoryCommission
  const selections = { mercadolivre: mlSel, shopee: {}, tiktok: {} }
  const costs = computeLotCosts(lot)
  const results = Object.fromEntries(
    MARKETPLACE_IDS.map((id) => [id, computeLotForMarketplace(lot, costs, settings.marketplaces[id], selections[id], settings.tax, settings.ads)]),
  ) as Record<(typeof MARKETPLACE_IDS)[number], ReturnType<typeof computeLotForMarketplace>>

  const projection = (q: number) => {
    // Mantém o frete por unidade atual ou o frete total informado, conforme a escolha.
    const freightTotal = freightMode === "unit" ? toReais(costs.unitCost.freight) * q : lot.freightTotal
    const l = { ...lot, quantity: q, freightTotal }
    const c = computeLotCosts(l)
    return { c, r: Object.fromEntries(MARKETPLACE_IDS.map((id) => [id, computeLotForMarketplace(l, c, settings.marketplaces[id], selections[id], settings.tax, settings.ads)])) as typeof results }
  }

  return (
    <>
      <PageHeader eyebrow="Compra" title="Analisar lote" description="Simule uma compra maior: o frete do fornecedor é rateado automaticamente e os totais consideram as taxas por venda de cada marketplace." />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4 self-start rounded-xl border bg-card p-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantidade">
              <NumberField value={lot.quantity} onChange={(v) => set("quantity")(Math.max(1, v ?? 1))} decimals={0} min={1} suffix="un." />
            </Field>
            <Field label="Preço unitário">
              <NumberField value={lot.unitPrice} onChange={set("unitPrice")} prefix="R$" />
            </Field>
            <Field label="Frete total fornecedor">
              <NumberField value={lot.freightTotal} onChange={set("freightTotal")} prefix="R$" />
            </Field>
            <Field label="Embalagem / un.">
              <NumberField value={lot.packagingUnit} onChange={set("packagingUnit")} prefix="R$" />
            </Field>
            <Field label="Outros custos / un.">
              <NumberField value={lot.otherUnit} onChange={set("otherUnit")} prefix="R$" />
            </Field>
            <Field label="Peso (kg)">
              <NumberField value={lot.weightKg} onChange={set("weightKg")} decimals={3} suffix="kg" placeholder="Opcional" />
            </Field>
          </div>
          <Field label="Preço de venda">
            <NumberField value={lot.salePrice} onChange={set("salePrice")} prefix="R$" className="h-10 text-base" />
          </Field>
          {cc && (
            <div className="grid gap-3 border-t border-dashed pt-4">
              <Field label="Mercado Livre · anúncio">
                <Segmented size="sm" className="w-full" value={mlSel.listingTypeId ?? cc.defaultListingTypeId} onChange={(v) => setMlSel((s) => ({ ...s, listingTypeId: v }))} options={cc.listingTypes.map((l) => ({ value: l.id, label: l.label }))} />
              </Field>
              <Field label="Mercado Livre · categoria">
                <AppSelect size="sm" value={mlSel.categoryId ?? cc.defaultCategoryId} onChange={(v) => setMlSel((s) => ({ ...s, categoryId: v }))} options={cc.categories.map((c) => ({ value: c.id, label: c.name }))} />
              </Field>
            </div>
          )}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Imposto ({settings.tax.enabled ? "ativo" : "desativado"}) e publicidade ({settings.ads.enabled ? "ativa" : "desativada"}) seguem os padrões de Configurações.
          </p>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground">Capital necessário</p>
              <p className="num mt-2 text-2xl font-semibold tracking-tight">{formatBRL(costs.capital)}</p>
              <p className="num mt-1 text-[11px] text-muted-foreground">
                Mercadoria {formatBRL(costs.merchandise)} + frete {formatBRL(costs.freight)}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground">Custo total do lote</p>
              <p className="num mt-2 text-2xl font-semibold tracking-tight">{formatBRL(costs.totalCost)}</p>
              <p className="num mt-1 text-[11px] text-muted-foreground">
                Capital + embalagens {formatBRL(costs.packaging)} + outros {formatBRL(costs.other)}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-xs text-muted-foreground">Custo real por unidade</p>
              <p className="num mt-2 text-2xl font-semibold tracking-tight">{formatBRL(costs.unitCost.total)}</p>
              <p className="num mt-1 text-[11px] text-muted-foreground">
                Frete rateado: {formatBRL(costs.freight)} ÷ {formatNumber(costs.quantity)} = {formatBRL(costs.unitCost.freight)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {MARKETPLACE_IDS.map((id, i) => {
              const r = results[id]
              return (
                <div key={id} className="animate-fade-up rounded-xl border bg-card" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="border-b px-5 py-3.5">
                    <MarketplaceName id={id} name={settings.marketplaces[id].name} className="text-sm font-medium" />
                  </div>
                  <div className="px-5 pt-4">
                    <p className="text-xs text-muted-foreground">Lucro total estimado</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight">
                      <Money cents={r.profit} tone />
                    </p>
                  </div>
                  <dl className="space-y-1.5 px-5 py-4 text-[13px]">
                    {[
                      ["Faturamento bruto", formatBRL(r.revenue)],
                      ["Taxas totais", "-" + formatBRL(r.fees)],
                      ...(r.tax > 0 ? [["Impostos", "-" + formatBRL(r.tax)]] : []),
                      ...(r.ads > 0 ? [["Publicidade", "-" + formatBRL(r.ads)]] : []),
                      ["Custo total do lote", "-" + formatBRL(costs.totalCost)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="num">{v}</dd>
                      </div>
                    ))}
                    <div className="mt-2 grid grid-cols-2 gap-3 border-t pt-3">
                      <div>
                        <dt className="text-[11px] text-muted-foreground">Margem</dt>
                        <dd>
                          <Pct value={r.margin} tone className="font-medium" />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-muted-foreground">ROI</dt>
                        <dd>
                          <Pct value={r.roi} tone className="font-medium" />
                        </dd>
                      </div>
                    </div>
                  </dl>
                  <p className="border-t px-5 py-3 text-[11px] text-muted-foreground">
                    Por unidade: taxas <span className="num">{formatBRL(r.unitSale.totalFees)}</span> · lucro <span className="num">{formatBRL(r.unitSale.profit)}</span>
                  </p>
                </div>
              )
            })}
          </div>

          <section className="rounded-xl border bg-card">
            <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">Quanto vou ganhar comprando…</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Lucro total do lote por marketplace em diferentes quantidades.</p>
              </div>
              <Segmented
                size="sm"
                value={freightMode}
                onChange={setFreightMode}
                options={[
                  { value: "unit", label: `Frete ${formatBRL(costs.unitCost.freight)}/un.` },
                  { value: "total", label: `Frete fixo ${formatBRL(costs.freight)}` },
                ]}
              />
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5 text-[11px] tracking-wide text-muted-foreground uppercase">Qtd.</TableHead>
                    <TableHead className="text-right text-[11px] tracking-wide text-muted-foreground uppercase">Capital</TableHead>
                    {MARKETPLACE_IDS.map((id) => (
                      <TableHead key={id} className="text-right text-xs">
                        <MarketplaceName id={id} name={settings.marketplaces[id].name} className="justify-end" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...new Set([...PROJECTION, costs.quantity])].sort((a, b) => a - b).map((q) => {
                    const { c, r } = projection(q)
                    return (
                      <TableRow key={q} className={cn(q === costs.quantity && "bg-muted/40")}>
                        <TableCell className="num pl-5 font-medium">{formatNumber(q)} un.</TableCell>
                        <TableCell className="num text-right text-muted-foreground">{formatBRL(c.capital)}</TableCell>
                        {MARKETPLACE_IDS.map((id) => (
                          <TableCell key={id} className="text-right">
                            <Money cents={r[id].profit} tone className="font-medium" />
                            <span className="ml-1.5 text-[11px] text-muted-foreground">
                              <Pct value={r[id].roi} /> ROI
                            </span>
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
