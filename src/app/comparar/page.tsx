"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"
import { MARKETPLACE_IDS, type AnalysisInput } from "@/types"
import { createEmptyAnalysis } from "@/config/defaults"
import { analyze } from "@/lib/calc"
import { formatBRL } from "@/lib/format"
import { useStore } from "@/components/providers/store-provider"
import { Field, PageHeader, Segmented } from "@/components/app/bits"
import { NumberField } from "@/components/app/number-field"
import { AppSelect } from "@/components/app/app-select"
import { ComparisonTable } from "@/components/analysis/comparison-table"
import { SaleBreakdown } from "@/components/analysis/sale-breakdown"
import { MarketplaceName } from "@/components/app/bits"
import { buttonVariants } from "@/components/ui/button"

type Source = "quick" | "saved"

export default function ComparePage() {
  const { hydrated, products, settings } = useStore()
  const [source, setSource] = React.useState<Source>("quick")
  const [productId, setProductId] = React.useState<string | undefined>()
  const [cost, setCost] = React.useState<number | null>(25)
  const [price, setPrice] = React.useState<number | null>(59.9)
  const [listing, setListing] = React.useState<string | undefined>()
  const [category, setCategory] = React.useState<string | undefined>()

  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-muted/30" />

  const cc = settings.marketplaces.mercadolivre.categoryCommission
  let input: AnalysisInput
  const saved = products.find((p) => p.id === productId)
  if (source === "saved" && saved) {
    input = saved.input
  } else {
    input = createEmptyAnalysis(settings)
    input.cost.supplierPrice = cost ?? 0
    input.salePrice = price ?? 0
    input.selections.mercadolivre = { listingTypeId: listing ?? cc?.defaultListingTypeId, categoryId: category ?? cc?.defaultCategoryId }
  }
  const res = analyze(input, settings)
  const sales = { mercadolivre: res.mercadolivre.sale, shopee: res.shopee.sale, tiktok: res.tiktok.sale }

  return (
    <>
      <PageHeader eyebrow="Decisão" title="Comparar marketplaces" description="Venda, taxas, valor recebido, lucro, margem e ROI lado a lado, com destaques objetivos por indicador." />

      <div className="mb-6 rounded-xl border bg-card p-5">
        <Segmented
          value={source}
          onChange={setSource}
          className="mb-5"
          options={[
            { value: "quick", label: "Valores rápidos" },
            { value: "saved", label: "Produto salvo" },
          ]}
        />
        {source === "quick" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Custo real por unidade" hint="Produto + frete + embalagem + outros">
              <NumberField value={cost} onChange={setCost} prefix="R$" />
            </Field>
            <Field label="Preço de venda">
              <NumberField value={price} onChange={setPrice} prefix="R$" />
            </Field>
            {cc && (
              <>
                <Field label="Mercado Livre · anúncio">
                  <Segmented size="sm" className="w-full" value={listing ?? cc.defaultListingTypeId} onChange={setListing} options={cc.listingTypes.map((l) => ({ value: l.id, label: l.label }))} />
                </Field>
                <Field label="Mercado Livre · categoria">
                  <AppSelect size="sm" value={category ?? cc.defaultCategoryId} onChange={setCategory} options={cc.categories.map((c) => ({ value: c.id, label: c.name }))} />
                </Field>
              </>
            )}
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto salvo ainda.</p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Produto" className="sm:w-96">
              <AppSelect value={productId} onChange={setProductId} placeholder="Escolha um produto" options={products.map((p) => ({ value: p.id, label: p.input.name }))} />
            </Field>
            {saved && (
              <Link href={`/analise?id=${saved.id}`} className={buttonVariants({ variant: "outline" })}>
                Abrir análise completa <ArrowUpRightIcon data-icon="inline-end" />
              </Link>
            )}
          </div>
        )}
        {source === "quick" && (
          <p className="mt-4 text-[11px] text-muted-foreground">
            Imposto e publicidade seguem os padrões de Configurações ({input.tax.enabled ? "imposto ativo" : "imposto desativado"}, {input.ads.enabled ? "publicidade ativa" : "publicidade desativada"}).
          </p>
        )}
      </div>

      {source === "saved" && !saved ? null : (
        <div className="space-y-8">
          <ComparisonTable results={sales} />
          <section>
            <h2 className="mb-3 text-sm font-semibold">Detalhamento de cada cálculo</h2>
            <div className="grid gap-4 xl:grid-cols-3">
              {MARKETPLACE_IDS.map((id) => (
                <div key={id} className="rounded-xl border bg-card p-4">
                  <p className="mb-3 flex items-center justify-between text-sm font-medium">
                    <MarketplaceName id={id} />
                    <span className="num text-xs text-muted-foreground">{formatBRL(sales[id].price)}</span>
                  </p>
                  <SaleBreakdown sale={sales[id]} tax={input.tax} ads={input.ads} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
