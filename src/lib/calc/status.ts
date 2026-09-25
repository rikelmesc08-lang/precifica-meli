import type { ProductStatus, TargetSettings } from "@/types"
import type { Cents } from "@/lib/money"

/**
 * Classificação configurável:
 *  - loss:   lucro < 0
 *  - below:  0 ≤ margem < margem mínima
 *  - within: margem mínima ≤ margem < margem alta
 *  - above:  margem ≥ margem alta
 */
export function classify(profit: Cents, margin: number | null, targets: TargetSettings): ProductStatus {
  if (profit < 0 || margin === null) return "loss"
  if (margin < targets.minMargin) return "below"
  if (margin < targets.highMargin) return "within"
  return "above"
}

export const STATUS_LABEL: Record<ProductStatus, string> = {
  loss: "Prejuízo",
  below: "Margem abaixo da meta",
  within: "Margem dentro da meta",
  above: "Margem acima da meta",
}

export const STATUS_SHORT: Record<ProductStatus, string> = {
  loss: "Prejuízo",
  below: "Abaixo da meta",
  within: "Dentro da meta",
  above: "Acima da meta",
}
