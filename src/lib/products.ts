import type { AnalysisInput, MarketplaceId, SavedProduct, Settings } from "@/types"
import { analyze, classify } from "@/lib/calc"
import { newId } from "@/lib/storage"

/** Calcula o snapshot salvo junto ao produto usando as taxas ATUAIS. */
export function buildSnapshot(input: AnalysisInput, marketplace: MarketplaceId, settings: Settings): SavedProduct["snapshot"] {
  const sale = analyze(input, settings)[marketplace].sale
  return {
    salePrice: sale.price,
    unitCost: sale.unitCost.total,
    profit: sale.profit,
    margin: sale.margin,
    roi: sale.roi,
    status: classify(sale.profit, sale.margin, settings.targets),
  }
}

/**
 * O snapshot salvo ficou desatualizado em relação às taxas/configurações atuais?
 * Compara o resultado recalculado com o salvo (preço, custo, lucro, margem e ROI).
 */
export function isSnapshotStale(p: SavedProduct, settings: Settings): boolean {
  const current = buildSnapshot(p.input, p.marketplace, settings)
  const saved = p.snapshot
  return (
    current.salePrice !== saved.salePrice ||
    current.unitCost !== saved.unitCost ||
    current.profit !== saved.profit ||
    current.margin !== saved.margin ||
    current.roi !== saved.roi
  )
}

export function createProduct(input: AnalysisInput, marketplace: MarketplaceId, settings: Settings): SavedProduct {
  const now = new Date().toISOString()
  return {
    id: newId(),
    input: structuredClone(input),
    marketplace,
    createdAt: now,
    updatedAt: now,
    calculatedAt: now,
    snapshot: buildSnapshot(input, marketplace, settings),
  }
}

export function recalculateProduct(p: SavedProduct, settings: Settings): SavedProduct {
  return { ...p, calculatedAt: new Date().toISOString(), snapshot: buildSnapshot(p.input, p.marketplace, settings) }
}

/** Indicadores agregados do dashboard, ponderados por quantidade. */
export function portfolioStats(products: SavedProduct[], settings: Settings) {
  let capital = 0
  let revenue = 0
  let profit = 0
  let profitable = 0
  for (const p of products) {
    const q = Math.max(1, Math.floor(p.input.cost.quantity || 1))
    const s = p.snapshot
    capital += s.unitCost * q
    revenue += s.salePrice * q
    profit += s.profit * q
    const status = classify(s.profit, s.margin, settings.targets)
    if (status === "within" || status === "above") profitable++
  }
  return { count: products.length, profitable, capital, revenue, profit }
}
