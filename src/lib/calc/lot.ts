import type { AdsSettings, MarketplaceConfig, MarketplaceSelection, TaxSettings } from "@/types"
import { multiplyCents, ratioPercent, toCents, type Cents } from "@/lib/money"
import { computeUnitCost, type UnitCost } from "./cost"
import { resolveRules } from "./fees"
import { computeSale, type SaleResult } from "./sale"

export interface LotInput {
  quantity: number
  unitPrice: number
  freightTotal: number
  packagingUnit: number
  otherUnit: number
  salePrice: number
  weightKg: number | null
}

export interface LotCosts {
  quantity: number
  /** Mercadoria: preço unitário × quantidade */
  merchandise: Cents
  freight: Cents
  packaging: Cents
  other: Cents
  /** Capital necessário = mercadoria + frete do fornecedor (desembolso da compra) */
  capital: Cents
  /** Custo total do lote = capital + embalagens + outros custos */
  totalCost: Cents
  /** Custo real por unidade (frete rateado arredondado ao centavo) */
  unitCost: UnitCost
}

export interface LotMarketplaceResult {
  unitSale: SaleResult
  revenue: Cents
  fees: Cents
  tax: Cents
  ads: Cents
  /** Lucro total = faturamento − taxas − imposto − publicidade − custo total do lote */
  profit: Cents
  margin: number | null
  roi: number | null
}

/**
 * Totais do lote usam valores EXATOS (ex.: frete R$ 100 / 3 un. entra como
 * R$ 100,00 no total, não 3 × R$ 33,33). Tarifas, imposto e publicidade
 * são cobrados por venda, então o total é o valor unitário × quantidade.
 */
export function computeLotCosts(lot: LotInput): LotCosts {
  const quantity = Math.max(1, Math.floor(lot.quantity || 1))
  const merchandise = multiplyCents(toCents(lot.unitPrice), quantity)
  const freight = toCents(lot.freightTotal)
  const packaging = multiplyCents(toCents(lot.packagingUnit), quantity)
  const other = multiplyCents(toCents(lot.otherUnit), quantity)
  const capital = merchandise + freight
  const unitCost = computeUnitCost({
    supplierPrice: lot.unitPrice,
    quantity,
    freightMode: "total",
    freightTotal: lot.freightTotal,
    freightUnit: 0,
    packagingUnit: lot.packagingUnit,
    otherUnit: lot.otherUnit,
    weightKg: lot.weightKg,
  })
  return { quantity, merchandise, freight, packaging, other, capital, totalCost: capital + packaging + other, unitCost }
}

export function computeLotForMarketplace(
  lot: LotInput,
  costs: LotCosts,
  config: MarketplaceConfig,
  selection: MarketplaceSelection,
  tax: TaxSettings,
  ads: AdsSettings,
): LotMarketplaceResult {
  const q = costs.quantity
  const unitSale = computeSale(
    { rules: resolveRules(config, selection), unitCost: costs.unitCost, weightKg: lot.weightKg && lot.weightKg > 0 ? lot.weightKg : null, tax, ads },
    toCents(lot.salePrice),
  )
  const revenue = unitSale.price * q
  const fees = unitSale.totalFees * q
  const taxTotal = unitSale.tax * q
  const adsTotal = unitSale.ads * q
  const profit = revenue - fees - taxTotal - adsTotal - costs.totalCost
  return {
    unitSale,
    revenue,
    fees,
    tax: taxTotal,
    ads: adsTotal,
    profit,
    margin: ratioPercent(profit, revenue),
    roi: ratioPercent(profit, costs.totalCost),
  }
}
