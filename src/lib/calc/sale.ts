import type { AdsSettings, TaxSettings } from "@/types"
import { percentOf, ratioPercent, toCents, type Cents } from "@/lib/money"
import type { UnitCost } from "./cost"
import { computeFeeLines, hasWeightCondition, type FeeLine, type ResolvedRule } from "./fees"

/** Tudo que é preciso para calcular uma venda em um marketplace. */
export interface SaleContext {
  rules: ResolvedRule[]
  unitCost: UnitCost
  weightKg: number | null
  tax: TaxSettings
  ads: AdsSettings
}

export interface SaleResult {
  price: Cents
  unitCost: UnitCost
  feeLines: FeeLine[]
  commission: Cents
  fixedFees: Cents
  logistics: Cents
  otherFees: Cents
  /** Total cobrado pela plataforma */
  totalFees: Cents
  /** Valor líquido recebido do marketplace = preço − taxas da plataforma */
  netReceived: Cents
  /** Imposto (0 se desativado) */
  tax: Cents
  /** Publicidade por venda (0 se desativado) */
  ads: Cents
  /** Lucro líquido = preço − custo real − taxas da plataforma − imposto − publicidade */
  profit: Cents
  /** Lucro / preço × 100 */
  margin: number | null
  /** Lucro / custo real × 100 */
  roi: number | null
  /** Taxas da plataforma / preço × 100 */
  feesPercent: number | null
  warnings: string[]
}

export function taxAmount(price: Cents, tax: TaxSettings): Cents {
  return tax.enabled && tax.percent > 0 ? percentOf(price, tax.percent) : 0
}

export function adsAmount(price: Cents, ads: AdsSettings): Cents {
  if (!ads.enabled || !(ads.value > 0)) return 0
  return ads.mode === "percent" ? percentOf(price, ads.value) : toCents(ads.value)
}

export function computeSale(ctx: SaleContext, price: Cents): SaleResult {
  const feeLines = computeFeeLines(ctx.rules, price, ctx.weightKg)
  const sumGroup = (g: FeeLine["group"]) => feeLines.filter((l) => l.group === g).reduce((a, l) => a + l.amount, 0)
  const commission = sumGroup("commission")
  const fixedFees = sumGroup("fixed")
  const logistics = sumGroup("logistics")
  const otherFees = sumGroup("other")
  const totalFees = commission + fixedFees + logistics + otherFees
  const netReceived = price - totalFees
  const tax = taxAmount(price, ctx.tax)
  const ads = adsAmount(price, ctx.ads)
  const profit = netReceived - tax - ads - ctx.unitCost.total

  const warnings: string[] = []
  if (ctx.weightKg === null && ctx.rules.some(hasWeightCondition)) {
    warnings.push("Há tarifas que dependem do peso. Informe o peso para incluí-las.")
  }

  return {
    price,
    unitCost: ctx.unitCost,
    feeLines,
    commission,
    fixedFees,
    logistics,
    otherFees,
    totalFees,
    netReceived,
    tax,
    ads,
    profit,
    margin: ratioPercent(profit, price),
    roi: ratioPercent(profit, ctx.unitCost.total),
    feesPercent: ratioPercent(totalFees, price),
    warnings,
  }
}
