import type { CostInput } from "@/types"
import { divideCents, toCents, type Cents } from "@/lib/money"

export interface UnitCost {
  product: Cents
  freight: Cents
  packaging: Cents
  other: Cents
  /** Custo real = produto + frete rateado + embalagem + outros */
  total: Cents
}

/**
 * Custo real por unidade.
 * Frete: se informado como total do pedido, é rateado pela quantidade
 * (arredondado ao centavo). Se informado por unidade, usa o valor direto.
 */
export function computeUnitCost(cost: CostInput): UnitCost {
  const quantity = Math.max(1, Math.floor(cost.quantity || 1))
  const product = toCents(cost.supplierPrice)
  const freight = cost.freightMode === "unit" ? toCents(cost.freightUnit) : divideCents(toCents(cost.freightTotal), quantity)
  const packaging = toCents(cost.packagingUnit)
  const other = toCents(cost.otherUnit)
  return { product, freight, packaging, other, total: product + freight + packaging + other }
}
