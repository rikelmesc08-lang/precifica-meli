"use client"

import * as React from "react"
import { ChevronDownIcon, MegaphoneIcon, PackageIcon, PercentIcon, StoreIcon, TagIcon, TruckIcon } from "lucide-react"
import { MARKETPLACE_IDS, type AnalysisInput, type MarketplaceId, type Settings } from "@/types"
import { CATEGORY_RULE_ID, computeUnitCost } from "@/lib/calc"
import { formatBRL, formatPercent } from "@/lib/format"
import { toCents } from "@/lib/money"
import { cn } from "@/lib/utils"
import { Field, Hint, MarketplaceName, Segmented } from "@/components/app/bits"
import { NumberField } from "@/components/app/number-field"
import { AppSelect } from "@/components/app/app-select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

type Update = (fn: (draft: AnalysisInput) => void) => void

function Block({ title, icon: Icon, children, action }: { title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-4 border-b px-5 py-5 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold">
          <Icon className="size-3.5 text-muted-foreground" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function ruleRange(min: number | null, max: number | null) {
  if (min === null && max === null) return "qualquer preço"
  if (min === null) return `abaixo de ${formatBRL(toCents(max!))}`
  if (max === null) return `a partir de ${formatBRL(toCents(min))}`
  return `${formatBRL(toCents(min))} a ${formatBRL(toCents(max))}`
}

function MarketplaceOptions({ id, input, settings, update }: { id: MarketplaceId; input: AnalysisInput; settings: Settings; update: Update }) {
  const [open, setOpen] = React.useState(false)
  const config = settings.marketplaces[id]
  const sel = input.selections[id] ?? {}
  const overrides = sel.feeOverrides ?? {}
  const cc = config.categoryCommission
  const isOn = (ruleId: string, def: boolean) => overrides[ruleId] ?? def
  const toggle = (ruleId: string, value: boolean) =>
    update((d) => {
      d.selections[id] = { ...d.selections[id], feeOverrides: { ...(d.selections[id]?.feeOverrides ?? {}), [ruleId]: value } }
    })
  const activeCount = config.fees.filter((f) => isOn(f.id, f.enabled)).length + (cc?.enabled && isOn(CATEGORY_RULE_ID, true) ? 1 : 0)

  return (
    <div className="rounded-lg border bg-background/30">
      <button type="button" aria-expanded={open} aria-controls={`fees-${id}`} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left text-[13px] transition-colors hover:bg-muted/40">
        <MarketplaceName id={id} className="font-medium" />
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {activeCount} regras ativas
          <ChevronDownIcon aria-hidden className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {cc?.enabled && (
        <div className="grid gap-3 border-t px-3.5 py-3 sm:grid-cols-2">
          <Field label="Tipo de anúncio">
            <Segmented
              size="sm"
              className="w-full"
              value={sel.listingTypeId ?? cc.defaultListingTypeId}
              onChange={(v) => update((d) => void (d.selections[id] = { ...d.selections[id], listingTypeId: v }))}
              options={cc.listingTypes.map((l) => ({ value: l.id, label: l.label }))}
            />
          </Field>
          <Field label="Categoria (comissão)">
            <AppSelect
              size="sm"
              value={sel.categoryId ?? cc.defaultCategoryId}
              onChange={(v) => update((d) => void (d.selections[id] = { ...d.selections[id], categoryId: v }))}
              options={cc.categories.map((c) => ({ value: c.id, label: `${c.name} · ${formatPercent(c.rates[sel.listingTypeId ?? cc.defaultListingTypeId] ?? 0)}` }))}
            />
          </Field>
        </div>
      )}

      {open && (
        <div id={`fees-${id}`} className="space-y-1 border-t px-3.5 py-3">
          <p className="pb-1 text-[11px] text-muted-foreground">Ligue/desligue cobranças só nesta análise. Valores são editados em Configurações.</p>
          {config.fees.map((f) => (
            <label key={f.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/40">
              <span className="min-w-0">
                <span className="block truncate text-xs">{f.label}</span>
                <span className="num block text-[11px] text-muted-foreground">
                  {f.kind === "percent" ? formatPercent(f.value) : formatBRL(toCents(f.value))} · {ruleRange(f.minPrice, f.maxPrice)}
                  {f.kind === "fixed" && f.value === 0 && <span className="text-warn"> · valor não informado</span>}
                </span>
              </span>
              <Switch size="sm" aria-label={`${config.name}: ${f.label}`} checked={isOn(f.id, f.enabled)} onCheckedChange={(v) => toggle(f.id, v)} />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function AnalysisForm({ input, update, settings }: { input: AnalysisInput; update: Update; settings: Settings }) {
  const unit = computeUnitCost(input.cost)
  const [perMarketPrice, setPerMarketPrice] = React.useState(() => MARKETPLACE_IDS.some((id) => (input.priceOverrides[id] ?? 0) > 0))

  return (
    <div className="rounded-xl border bg-card">
      <Block title="Produto" icon={TagIcon}>
        <Field label="Nome do produto" htmlFor="name">
          <Input id="name" className="h-9 bg-input/20" placeholder="Ex.: Organizador de gaveta 6 divisórias" value={input.name} onChange={(e) => update((d) => void (d.name = e.target.value))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria" htmlFor="category">
            <Input id="category" className="h-9 bg-input/20" placeholder="Ex.: Casa" value={input.category} onChange={(e) => update((d) => void (d.category = e.target.value))} />
          </Field>
          <Field label="Fornecedor" htmlFor="supplier">
            <Input id="supplier" className="h-9 bg-input/20" placeholder="Opcional" value={input.supplier} onChange={(e) => update((d) => void (d.supplier = e.target.value))} />
          </Field>
        </div>
      </Block>

      <Block title="Custos" icon={PackageIcon}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preço do fornecedor (unidade)" htmlFor="supplierPrice">
            <NumberField id="supplierPrice" value={input.cost.supplierPrice} onChange={(v) => update((d) => void (d.cost.supplierPrice = v ?? 0))} prefix="R$" />
          </Field>
          <Field label="Quantidade comprada" htmlFor="quantity">
            <NumberField id="quantity" value={input.cost.quantity} onChange={(v) => update((d) => void (d.cost.quantity = Math.max(1, v ?? 1)))} decimals={0} min={1} suffix="un." />
          </Field>
        </div>
        <Field label="Frete do fornecedor">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Segmented
              size="sm"
              className="sm:w-56"
              value={input.cost.freightMode}
              onChange={(v) => update((d) => void (d.cost.freightMode = v))}
              options={[
                { value: "total", label: "Total do pedido" },
                { value: "unit", label: "Por unidade" },
              ]}
            />
            {input.cost.freightMode === "total" ? (
              <NumberField aria-label="Frete total" value={input.cost.freightTotal} onChange={(v) => update((d) => void (d.cost.freightTotal = v ?? 0))} prefix="R$" />
            ) : (
              <NumberField aria-label="Frete por unidade" value={input.cost.freightUnit} onChange={(v) => update((d) => void (d.cost.freightUnit = v ?? 0))} prefix="R$" />
            )}
          </div>
          {input.cost.freightMode === "total" && input.cost.freightTotal > 0 && (
            <p className="num text-[11px] text-muted-foreground">
              Rateio: {formatBRL(toCents(input.cost.freightTotal))} ÷ {input.cost.quantity} un. = <span className="text-foreground">{formatBRL(unit.freight)}</span> por unidade
            </p>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Embalagem / un." htmlFor="packaging">
            <NumberField id="packaging" value={input.cost.packagingUnit} onChange={(v) => update((d) => void (d.cost.packagingUnit = v ?? 0))} prefix="R$" />
          </Field>
          <Field label="Outros custos / un." htmlFor="other">
            <NumberField id="other" value={input.cost.otherUnit} onChange={(v) => update((d) => void (d.cost.otherUnit = v ?? 0))} prefix="R$" />
          </Field>
          <Field label="Peso (kg)" htmlFor="weight">
            <NumberField id="weight" value={input.cost.weightKg} onChange={(v) => update((d) => void (d.cost.weightKg = v))} decimals={3} suffix="kg" placeholder="Opcional" />
          </Field>
        </div>
      </Block>

      <Block
        title="Venda"
        icon={StoreIcon}
        action={
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
            Preço por marketplace
            <Switch
              size="sm"
              aria-label="Preço por marketplace"
              checked={perMarketPrice}
              onCheckedChange={(v) => {
                setPerMarketPrice(v)
                if (!v) update((d) => void (d.priceOverrides = {}))
              }}
            />
          </label>
        }
      >
        <Field label={perMarketPrice ? "Preço padrão" : "Preço de venda pretendido"} htmlFor="salePrice">
          <NumberField id="salePrice" value={input.salePrice} onChange={(v) => update((d) => void (d.salePrice = v ?? 0))} prefix="R$" className="h-10 text-base" />
        </Field>
        {perMarketPrice && (
          <div className="grid gap-3 sm:grid-cols-3">
            {MARKETPLACE_IDS.map((id) => (
              <Field key={id} label={settings.marketplaces[id].name}>
                <NumberField
                  value={input.priceOverrides[id] ?? null}
                  onChange={(v) => update((d) => void (d.priceOverrides[id] = v))}
                  prefix="R$"
                  placeholder="Padrão"
                />
              </Field>
            ))}
          </div>
        )}
      </Block>

      <Block title="Marketplaces" icon={TruckIcon}>
        <div className="space-y-2.5">
          {MARKETPLACE_IDS.map((id) => (
            <MarketplaceOptions key={id} id={id} input={input} settings={settings} update={update} />
          ))}
        </div>
      </Block>

      <Block title="Imposto e publicidade" icon={PercentIcon}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[13px]">
              Imposto sobre a venda
              <Hint>Tributos dependem do regime tributário e da operação da empresa. Configure de acordo com sua situação.</Hint>
            </span>
            <Switch aria-label="Imposto sobre a venda" checked={input.tax.enabled} onCheckedChange={(v) => update((d) => void (d.tax.enabled = v))} />
          </div>
          {input.tax.enabled && (
            <Field label="Alíquota sobre o preço de venda" hint="Tributos dependem do regime tributário e da operação da empresa. Configure de acordo com sua situação.">
              <NumberField value={input.tax.percent} onChange={(v) => update((d) => void (d.tax.percent = v ?? 0))} suffix="%" />
            </Field>
          )}
        </div>
        <div className="space-y-3 border-t border-dashed pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[13px]">
              <MegaphoneIcon className="size-3.5 text-muted-foreground" />
              Custo de publicidade
            </span>
            <Switch aria-label="Custo de publicidade" checked={input.ads.enabled} onCheckedChange={(v) => update((d) => void (d.ads.enabled = v))} />
          </div>
          {input.ads.enabled && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Segmented
                aria-label="Forma de cobrança da publicidade"
                size="sm"
                className="sm:w-60"
                value={input.ads.mode}
                onChange={(v) => update((d) => void (d.ads.mode = v))}
                options={[
                  { value: "fixed", label: "CPA (R$/venda)" },
                  { value: "percent", label: "% da venda" },
                ]}
              />
              <NumberField
                aria-label="Valor de publicidade"
                value={input.ads.value}
                onChange={(v) => update((d) => void (d.ads.value = v ?? 0))}
                prefix={input.ads.mode === "fixed" ? "R$" : undefined}
                suffix={input.ads.mode === "percent" ? "%" : undefined}
              />
            </div>
          )}
        </div>
      </Block>
    </div>
  )
}
