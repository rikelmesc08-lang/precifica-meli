import { describe, expect, it } from "vitest"
import type { AdsSettings, FeeRule, MarketplaceConfig, TaxSettings } from "@/types"
import { toCents } from "@/lib/money"
import { formatBRL, formatPercent } from "@/lib/format"
import { createDefaultSettings, createEmptyAnalysis } from "@/config/defaults"
import {
  analyze,
  classify,
  computeLotCosts,
  computeLotForMarketplace,
  computeSale,
  computeUnitCost,
  highlights,
  meetsTarget,
  resolveRules,
  solvePrice,
  type SaleContext,
} from "./index"

// ---------- helpers ----------
const NO_TAX: TaxSettings = { enabled: false, percent: 0 }
const NO_ADS: AdsSettings = { enabled: false, mode: "fixed", value: 0 }

function fee(p: Partial<FeeRule> & Pick<FeeRule, "id" | "kind" | "value">): FeeRule {
  return { label: p.id, group: p.kind === "percent" ? "commission" : "fixed", enabled: true, minPrice: null, maxPrice: null, cap: null, ...p }
}

function market(fees: FeeRule[], extra: Partial<MarketplaceConfig> = {}): MarketplaceConfig {
  return { id: "shopee", name: "Teste", fees, sources: [], lastUpdatedAt: null, lastUpdatedNote: "", ...extra }
}

function ctx(fees: FeeRule[], costReais: number, opts: { tax?: TaxSettings; ads?: AdsSettings; weightKg?: number | null } = {}): SaleContext {
  const c = toCents(costReais)
  return {
    rules: resolveRules(market(fees)),
    unitCost: { product: c, freight: 0, packaging: 0, other: 0, total: c },
    weightKg: opts.weightKg ?? null,
    tax: opts.tax ?? NO_TAX,
    ads: opts.ads ?? NO_ADS,
  }
}

// Estrutura de faixas usada em vários testes (valores arbitrários de teste)
const TIERED = [
  fee({ id: "c-a", kind: "percent", value: 10, maxPrice: 50 }),
  fee({ id: "c-b", kind: "percent", value: 6, minPrice: 50 }),
  fee({ id: "f-a", kind: "fixed", value: 4, maxPrice: 50 }),
  fee({ id: "f-b", kind: "fixed", value: 6, minPrice: 50 }),
]

// ---------- custo real ----------
describe("custo real por unidade", () => {
  it("soma produto + frete rateado + embalagem + outros (exemplo do enunciado)", () => {
    const u = computeUnitCost({ supplierPrice: 22, quantity: 100, freightMode: "total", freightTotal: 300, freightUnit: 0, packagingUnit: 1, otherUnit: 0, weightKg: null })
    expect(u.freight).toBe(300)
    expect(u.total).toBe(2600)
  })

  it("frete por unidade informado diretamente ignora o total", () => {
    const u = computeUnitCost({ supplierPrice: 22, quantity: 10, freightMode: "unit", freightTotal: 999, freightUnit: 3, packagingUnit: 1, otherUnit: 0.5, weightKg: null })
    expect(u.total).toBe(2650)
  })

  it("rateio com dízima arredonda ao centavo", () => {
    const u = computeUnitCost({ supplierPrice: 10, quantity: 3, freightMode: "total", freightTotal: 100, freightUnit: 0, packagingUnit: 0, otherUnit: 0, weightKg: null })
    expect(u.freight).toBe(3333)
  })

  it("evita erro de ponto flutuante (0,1 + 0,2)", () => {
    const u = computeUnitCost({ supplierPrice: 0.1, quantity: 1, freightMode: "unit", freightTotal: 0, freightUnit: 0.2, packagingUnit: 0, otherUnit: 0, weightKg: null })
    expect(u.total).toBe(30)
  })
})

// ---------- venda ----------
describe("cálculo da venda", () => {
  it("produto barato com tarifa fixa", () => {
    const c = ctx([fee({ id: "c", kind: "percent", value: 12 }), fee({ id: "f", kind: "fixed", value: 6.25, minPrice: 12.5, maxPrice: 29 })], 8)
    const r = computeSale(c, toCents(19.9))
    expect(r.commission).toBe(239) // 19,90 × 12% = 2,388 → 2,39
    expect(r.fixedFees).toBe(625)
    expect(r.totalFees).toBe(864)
    expect(r.netReceived).toBe(1126)
    expect(r.profit).toBe(326)
    expect(r.margin).toBe(16.38) // 3,26 / 19,90
    expect(r.roi).toBe(40.75) // 3,26 / 8,00
  })

  it("tarifa percentual de 50% abaixo de R$ 12,50 (custo = metade do preço)", () => {
    const c = ctx([fee({ id: "half", kind: "percent", value: 50, group: "fixed", maxPrice: 12.5 })], 3)
    expect(computeSale(c, 1000).fixedFees).toBe(500)
    expect(computeSale(c, 1250).fixedFees).toBe(0) // fronteira exclusiva
  })

  it("produto caro com faixa de tarifa fixa alta", () => {
    const fees = [
      fee({ id: "c", kind: "percent", value: 14, minPrice: 80 }),
      fee({ id: "f1", kind: "fixed", value: 20, minPrice: 100, maxPrice: 200 }),
      fee({ id: "f2", kind: "fixed", value: 26, minPrice: 200, maxPrice: 500 }),
    ]
    const r = computeSale(ctx(fees, 120), toCents(250))
    expect(r.commission).toBe(3500)
    expect(r.fixedFees).toBe(2600)
    expect(r.profit).toBe(25000 - 6100 - 12000)
  })

  it("respeita a fronteira de faixa [min, max)", () => {
    const fees = [
      fee({ id: "ca", kind: "percent", value: 20, maxPrice: 80 }),
      fee({ id: "cb", kind: "percent", value: 14, minPrice: 80 }),
      fee({ id: "fa", kind: "fixed", value: 4, maxPrice: 80 }),
      fee({ id: "fb", kind: "fixed", value: 16, minPrice: 80 }),
    ]
    expect(computeSale(ctx(fees, 0), toCents(79.99)).totalFees).toBe(1600 + 400) // 15,998 → 16,00
    expect(computeSale(ctx(fees, 0), toCents(80)).totalFees).toBe(1120 + 1600)
  })

  it("aplica teto em cobranças percentuais", () => {
    const r = computeSale(ctx([fee({ id: "c", kind: "percent", value: 20, cap: 100 })], 0), toCents(500))
    expect(r.commission).toBe(10000)
    expect(r.feeLines[0].capped).toBe(false)
    const r2 = computeSale(ctx([fee({ id: "c", kind: "percent", value: 20, cap: 100 })], 0), toCents(1200))
    expect(r2.commission).toBe(10000)
    expect(r2.feeLines[0].capped).toBe(true)
  })

  it("frete/logística entra como linha própria", () => {
    const r = computeSale(ctx([fee({ id: "ship", kind: "fixed", value: 21.45, group: "logistics", minPrice: 79 })], 50), toCents(99.9))
    expect(r.logistics).toBe(2145)
    expect(r.totalFees).toBe(2145)
  })

  it("imposto e publicidade são separados das taxas da plataforma", () => {
    const c = ctx([fee({ id: "c", kind: "percent", value: 12 })], 26, {
      tax: { enabled: true, percent: 10 },
      ads: { enabled: true, mode: "fixed", value: 8 },
    })
    const r = computeSale(c, toCents(59.9))
    expect(r.totalFees).toBe(719) // 7,188 → 7,19
    expect(r.netReceived).toBe(5990 - 719)
    expect(r.tax).toBe(599)
    expect(r.ads).toBe(800)
    expect(r.profit).toBe(5990 - 719 - 599 - 800 - 2600)
  })

  it("imposto desativado não é cobrado mesmo com percentual preenchido", () => {
    const r = computeSale(ctx([], 10, { tax: { enabled: false, percent: 10 } }), 5000)
    expect(r.tax).toBe(0)
  })

  it("publicidade percentual (ACOS)", () => {
    const r = computeSale(ctx([], 10, { ads: { enabled: true, mode: "percent", value: 10 } }), 5990)
    expect(r.ads).toBe(599)
  })

  it("não confunde margem com ROI", () => {
    const r = computeSale(ctx([], 50), 10000)
    expect(r.profit).toBe(5000)
    expect(r.margin).toBe(50) // lucro / preço
    expect(r.roi).toBe(100) // lucro / custo
  })

  it("regras com faixa de peso exigem peso e não se acumulam", () => {
    const fees = [
      fee({ id: "w1", kind: "fixed", value: 6, group: "logistics", minWeight: null, maxWeight: 0.3 }),
      fee({ id: "w2", kind: "fixed", value: 9, group: "logistics", minWeight: 0.3, maxWeight: 1 }),
    ]
    expect(computeSale(ctx(fees, 10, { weightKg: 0.5 }), 5000).logistics).toBe(900)
    const noWeight = computeSale(ctx(fees, 10), 5000)
    expect(noWeight.logistics).toBe(0)
    expect(noWeight.warnings.length).toBe(1)
  })
})

// ---------- sem contagem dupla ----------
describe("nenhuma taxa contada duas vezes", () => {
  it("regras duplicadas por id entram uma vez", () => {
    const rules = resolveRules(market([fee({ id: "x", kind: "fixed", value: 5 }), fee({ id: "x", kind: "fixed", value: 5 })]))
    expect(rules).toHaveLength(1)
  })

  it("override da análise desliga regra sem alterar a configuração", () => {
    const cfg = market([fee({ id: "x", kind: "fixed", value: 5 })])
    expect(resolveRules(cfg, { feeOverrides: { x: false } })).toHaveLength(0)
    expect(cfg.fees[0].enabled).toBe(true)
  })

  it("total de taxas = soma das linhas = soma dos grupos", () => {
    const s = createDefaultSettings()
    const input = createEmptyAnalysis(s)
    input.cost.supplierPrice = 22
    input.salePrice = 59.9
    const res = analyze(input, s)
    for (const id of ["mercadolivre", "shopee", "tiktok"] as const) {
      const r = res[id].sale
      const lines = r.feeLines.reduce((a, l) => a + l.amount, 0)
      expect(lines).toBe(r.totalFees)
      expect(r.commission + r.fixedFees + r.logistics + r.otherFees).toBe(r.totalFees)
      expect(r.price - r.totalFees - r.tax - r.ads - r.unitCost.total).toBe(r.profit)
      expect(new Set(r.feeLines.map((l) => l.ruleId)).size).toBe(r.feeLines.length)
    }
  })

  it("Mercado Livre: comissão por categoria × tipo de anúncio", () => {
    const s = createDefaultSettings()
    const input = createEmptyAnalysis(s)
    input.cost.supplierPrice = 20
    input.salePrice = 100
    input.selections.mercadolivre = { listingTypeId: "premium", categoryId: "informatica" }
    const r = analyze(input, s).mercadolivre.sale
    const rate = s.marketplaces.mercadolivre.categoryCommission!.categories.find((c) => c.id === "informatica")!.rates.premium
    expect(r.commission).toBe(Math.round(10000 * rate / 100))
  })
})

// ---------- cálculos inversos ----------
describe("preço de equilíbrio", () => {
  it("resolve dentro da primeira faixa", () => {
    const res = solvePrice(ctx(TIERED, 40), { type: "breakeven" })
    expect(res.price).toBe(4889) // 0,9p = 44 → 48,89
    expect(res.result!.profit).toBe(0)
  })

  it("pula faixa inviável e resolve na faixa seguinte", () => {
    const res = solvePrice(ctx(TIERED, 47), { type: "breakeven" })
    expect(res.price).toBe(5638) // 0,94p = 53 → 56,38
    expect(res.result!.profit).toBeGreaterThanOrEqual(0)
    expect(computeSale(ctx(TIERED, 47), 5637).profit).toBeLessThan(0)
  })

  it("é o menor preço sem prejuízo (1 centavo abaixo dá prejuízo)", () => {
    for (const cost of [5, 12.34, 26, 39.9, 77.77, 150]) {
      const c = ctx(TIERED, cost)
      const res = solvePrice(c, { type: "breakeven" })
      expect(res.result!.profit).toBeGreaterThanOrEqual(0)
      expect(computeSale(c, res.price! - 1).profit).toBeLessThan(0)
    }
  })

  it("considera imposto e publicidade", () => {
    const c = ctx([fee({ id: "c", kind: "percent", value: 12 })], 26, { tax: { enabled: true, percent: 6 }, ads: { enabled: true, mode: "fixed", value: 8 } })
    const res = solvePrice(c, { type: "breakeven" })
    // p(1 − 0,12 − 0,06) = 34 → 41,4634 → 41,47
    expect(res.price).toBe(4147)
    expect(computeSale(c, 4146).profit).toBeLessThan(0)
  })
})

describe("preço por margem desejada", () => {
  it("margem ≠ markup: custo 26, sem taxas, margem 20% → R$ 32,50 (não R$ 31,20)", () => {
    const res = solvePrice(ctx([], 26), { type: "margin", percent: 20 })
    expect(res.price).toBe(3250)
    expect(res.result!.margin).toBe(20)
  })

  it("resolve com comissão percentual + tarifa fixa", () => {
    const c = ctx([fee({ id: "c", kind: "percent", value: 12 }), fee({ id: "f", kind: "fixed", value: 6.5 })], 26)
    const res = solvePrice(c, { type: "margin", percent: 20 })

    expect(res.price).toBe(4779) // p(1 − 0,12 − 0,20) = 32,5 → 47,79; o arredondamento da comissão (5,73) já atinge 20% em 47,79
    expect(meetsTarget(res.result!, { type: "margin", percent: 20 })).toBe(true)
    expect(meetsTarget(computeSale(c, 4778), { type: "margin", percent: 20 })).toBe(false)
  })

  it("resolve com faixas de preço", () => {
    for (const m of [5, 10, 20, 30, 45]) {
      const c = ctx(TIERED, 30)
      const res = solvePrice(c, { type: "margin", percent: m })
      expect(res.result!.margin!).toBeGreaterThanOrEqual(m)
      expect(meetsTarget(computeSale(c, res.price! - 1), { type: "margin", percent: m })).toBe(false)
    }
  })

  it("retorna sem solução quando percentuais + margem ≥ 100%", () => {
    const res = solvePrice(ctx([fee({ id: "c", kind: "percent", value: 30 })], 10, { tax: { enabled: true, percent: 20 } }), { type: "margin", percent: 50 })
    expect(res.price).toBeNull()
    expect(res.reason).toBeTruthy()
  })

  it("com teto, margens altas continuam possíveis acima do ponto do teto", () => {
    const c = ctx([fee({ id: "c", kind: "percent", value: 50, cap: 20 })], 10)
    const res = solvePrice(c, { type: "margin", percent: 60 })
    // abaixo de R$ 40 (ponto do teto) seria 1 − 0,5 − 0,6 < 0; acima: p − 20 − 10 = 0,6p → 75
    expect(res.price).toBe(7500)
  })
})

describe("preço por lucro desejado", () => {
  it("R$ 20 líquidos por unidade", () => {
    const c = ctx([fee({ id: "c", kind: "percent", value: 12 }), fee({ id: "f", kind: "fixed", value: 6.5, maxPrice: 79 })], 26)
    const res = solvePrice(c, { type: "profit", cents: 2000 })
    // 0,88p = 52,5 → 59,659 → 59,66
    expect(res.price).toBe(5966)
    expect(res.result!.profit).toBeGreaterThanOrEqual(2000)
    expect(computeSale(c, 5965).profit).toBeLessThan(2000)
  })

  it("encontra o preço quando o degrau de tarifa (≥ R$ 79 com frete) exige subir de faixa", () => {
    const fees = [
      fee({ id: "c", kind: "percent", value: 12 }),
      fee({ id: "f", kind: "fixed", value: 6.5, maxPrice: 79 }),
      fee({ id: "s", kind: "fixed", value: 25, group: "logistics", minPrice: 79 }),
    ]
    const c = ctx(fees, 40)
    const res = solvePrice(c, { type: "profit", cents: 3000 })
    // abaixo de 79: 0,88p = 76,5 → 86,93 (fora da faixa). acima: 0,88p = 95 → 107,95
    expect(res.price).toBe(10795) // 107,954…; com comissão arredondada (12,95) R$ 107,95 já rende R$ 30,00
    expect(res.result!.profit).toBeGreaterThanOrEqual(3000)
  })
})

// ---------- lote ----------
describe("análise de lote", () => {
  const lot = { quantity: 100, unitPrice: 18, freightTotal: 240, packagingUnit: 0.8, otherUnit: 0, salePrice: 49.9, weightKg: null }

  it("rateia frete e soma custos do exemplo do enunciado", () => {
    const c = computeLotCosts(lot)
    expect(c.unitCost.freight).toBe(240)
    expect(c.unitCost.total).toBe(2120)
    expect(c.capital).toBe(204000)
    expect(c.totalCost).toBe(212000)
  })

  it("lucro total = faturamento − taxas − custo total", () => {
    const c = computeLotCosts(lot)
    const r = computeLotForMarketplace(lot, c, market([fee({ id: "c", kind: "percent", value: 10 })]), {}, NO_TAX, NO_ADS)
    expect(r.revenue).toBe(499000)
    expect(r.fees).toBe(49900)
    expect(r.profit).toBe(499000 - 49900 - 212000)
    expect(r.margin).toBe(47.52) // 2.371,00 / 4.990,00 = 47,515…
  })

  it("usa frete exato no total mesmo com rateio em dízima", () => {
    const c = computeLotCosts({ ...lot, quantity: 3, freightTotal: 100 })
    expect(c.freight).toBe(10000)
    expect(c.unitCost.freight).toBe(3333)
  })
})

// ---------- status e destaques ----------
describe("classificação e destaques", () => {
  const t = { minMargin: 15, highMargin: 25 }
  it("classifica pelas metas configuradas", () => {
    expect(classify(-1, -0.1, t)).toBe("loss")
    expect(classify(100, 10, t)).toBe("below")
    expect(classify(100, 15, t)).toBe("within")
    expect(classify(100, 25, t)).toBe("above")
  })

  it("destaca cada indicador sem eleger uma plataforma", () => {
    const s = createDefaultSettings()
    const input = createEmptyAnalysis(s)
    input.cost.supplierPrice = 25
    input.salePrice = 59.9
    const res = analyze(input, s)
    const h = highlights({ mercadolivre: res.mercadolivre.sale, shopee: res.shopee.sale, tiktok: res.tiktok.sale })
    expect(h.maxProfit.length).toBeGreaterThan(0)
    expect(h.minFees.length).toBeGreaterThan(0)
  })
})

// ---------- formatação ----------
describe("formatação brasileira", () => {
  it("R$ 59,90", () => {
    expect(formatBRL(5990)).toBe("R$ 59,90")
    expect(formatBRL(123456789)).toBe("R$ 1.234.567,89")
    expect(formatPercent(16.38)).toBe("16,38%")
  })
})

// ---------- propriedade: solver × motor direto ----------
describe("solver inverso em configurações aleatórias", () => {
  // PRNG determinístico para o teste ser reprodutível
  let seed = 42
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]

  it("o preço encontrado atinge o objetivo e 1 centavo abaixo não atinge", () => {
    for (let i = 0; i < 400; i++) {
      const split = pick([29, 50, 79, 80, 100])
      const fees = [
        fee({ id: "ca", kind: "percent", value: pick([6, 10, 11.5, 14, 20]), maxPrice: split }),
        fee({ id: "cb", kind: "percent", value: pick([6, 12, 14, 16.5]), minPrice: split, cap: pick([null, 50, 100]) }),
        fee({ id: "fa", kind: "fixed", value: pick([0, 4, 6.25, 6.75]), maxPrice: split }),
        fee({ id: "fb", kind: "fixed", value: pick([0, 6, 16, 25]), minPrice: split }),
      ]
      const c = ctx(fees, Math.round(rand() * 20000) / 100, {
        tax: { enabled: rand() > 0.5, percent: pick([4, 6, 10.5]) },
        ads: rand() > 0.5 ? { enabled: true, mode: "fixed", value: pick([2, 8]) } : { enabled: true, mode: "percent", value: pick([3, 10]) },
      })
      const target = pick([
        { type: "breakeven" as const },
        { type: "profit" as const, cents: pick([500, 2000, 3333]) },
        { type: "margin" as const, percent: pick([5, 15, 20, 25]) },
      ])
      const res = solvePrice(c, target)
      if (res.price === null) continue
      expect(meetsTarget(computeSale(c, res.price), target)).toBe(true)
      expect(meetsTarget(computeSale(c, res.price - 1), target)).toBe(false)
    }
  })
})
