import { MARKETPLACE_IDS, type AnalysisInput, type MarketplaceId, type Settings } from "@/types"
import { toCents, type Cents } from "@/lib/money"
import { computeUnitCost, type UnitCost } from "./cost"
import { resolveRules } from "./fees"
import { computeSale, type SaleContext, type SaleResult } from "./sale"
import { solvePrice, type SolveResult } from "./solver"

export function buildContext(input: AnalysisInput, settings: Settings, marketplace: MarketplaceId, unitCost?: UnitCost): SaleContext {
  return {
    rules: resolveRules(settings.marketplaces[marketplace], input.selections[marketplace]),
    unitCost: unitCost ?? computeUnitCost(input.cost),
    weightKg: input.cost.weightKg && input.cost.weightKg > 0 ? input.cost.weightKg : null,
    tax: input.tax,
    ads: input.ads,
  }
}

export function priceFor(input: AnalysisInput, marketplace: MarketplaceId): Cents {
  const override = input.priceOverrides[marketplace]
  return toCents(override !== null && override !== undefined && override > 0 ? override : input.salePrice)
}

export type AnalysisResult = Record<MarketplaceId, { ctx: SaleContext; sale: SaleResult; breakeven: SolveResult }>

export function analyze(input: AnalysisInput, settings: Settings): AnalysisResult {
  const unitCost = computeUnitCost(input.cost)
  const out = {} as AnalysisResult
  for (const id of MARKETPLACE_IDS) {
    const ctx = buildContext(input, settings, id, unitCost)
    out[id] = {
      ctx,
      sale: computeSale(ctx, priceFor(input, id)),
      breakeven: solvePrice(ctx, { type: "breakeven" }),
    }
  }
  return out
}

/** Destaques objetivos — sem eleger uma "melhor" plataforma. */
export interface Highlights {
  maxProfit: MarketplaceId[]
  maxMargin: MarketplaceId[]
  maxRoi: MarketplaceId[]
  minFees: MarketplaceId[]
}

export function highlights(results: Record<MarketplaceId, SaleResult>): Highlights {
  const pick = (value: (r: SaleResult) => number | null, mode: "max" | "min") => {
    const vals = MARKETPLACE_IDS.map((id) => ({ id, v: value(results[id]) })).filter((x) => x.v !== null) as { id: MarketplaceId; v: number }[]
    if (!vals.length) return []
    const best = mode === "max" ? Math.max(...vals.map((x) => x.v)) : Math.min(...vals.map((x) => x.v))
    return vals.filter((x) => x.v === best).map((x) => x.id)
  }
  return {
    maxProfit: pick((r) => r.profit, "max"),
    maxMargin: pick((r) => r.margin, "max"),
    maxRoi: pick((r) => r.roi, "max"),
    minFees: pick((r) => r.totalFees, "min"),
  }
}

export function priceRange(start: Cents, end: Cents, step: Cents, limit = 200): Cents[] {
  if (step <= 0 || end < start) return start > 0 ? [start] : []
  const out: Cents[] = []
  for (let p = start; p <= end && out.length < limit; p += step) out.push(p)
  return out
}
