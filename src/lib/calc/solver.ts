import { Decimal, ceilCents, toCents, type Cents } from "@/lib/money"
import { ruleApplies } from "./fees"
import { computeSale, type SaleContext, type SaleResult } from "./sale"

/**
 * CÁLCULO INVERSO DE PREÇO
 *
 * Objetivos suportados:
 *  - breakeven:  lucro ≥ 0
 *  - profit:     lucro ≥ X centavos por unidade
 *  - margin:     lucro / preço ≥ m%   (margem sobre o PREÇO, não markup sobre o custo)
 *
 * As deduções são lineares por trechos no preço p:
 *   lucro(p) = p − Σ(rᵢ·p) − Σ(fixas) − imposto%·p − ads%·p − adsFixo − custo
 * mudando de fórmula apenas nas fronteiras de faixa de preço das regras e nos
 * pontos em que um teto (cap) passa a valer. O algoritmo:
 *  1. levanta todos esses pontos de quebra;
 *  2. em cada trecho [a, b) monta g(p) = A·p − B e resolve g(p) = 0;
 *  3. escolhe o MENOR preço válido que atinge o objetivo;
 *  4. arredonda para cima ao centavo e VERIFICA com o motor real
 *     (que arredonda cada tarifa), avançando centavo a centavo se preciso.
 */

export type PriceTarget = { type: "breakeven" } | { type: "profit"; cents: Cents } | { type: "margin"; percent: number }

export interface SolveResult {
  price: Cents | null
  result: SaleResult | null
  /** Motivo quando não há solução */
  reason?: string
  /** Próxima fronteira de faixa acima do preço encontrado (para alertar degraus de tarifa) */
  nextBreakpoint: Cents | null
}

const MAX_PRICE: Cents = toCents(1_000_000)
const MAX_VERIFY_STEPS = 5000
const MAX_BACK_STEPS = 100

export function meetsTarget(result: SaleResult, target: PriceTarget): boolean {
  switch (target.type) {
    case "breakeven":
      return result.profit >= 0
    case "profit":
      return result.profit >= target.cents
    case "margin":
      // lucro/preço ≥ m/100  ⇔  lucro·100 ≥ m·preço (sem divisão, sem arredondar a margem)
      return result.price > 0 && new Decimal(result.profit).times(100).gte(new Decimal(target.percent).times(result.price))
  }
}

function breakpoints(ctx: SaleContext): Cents[] {
  const pts = new Set<number>([0])
  for (const r of ctx.rules) {
    if (!ruleApplies({ ...r, minPrice: null, maxPrice: null }, 0, ctx.weightKg)) continue
    if (r.minPrice !== null) pts.add(r.minPrice)
    if (r.maxPrice !== null) pts.add(r.maxPrice)
    if (r.kind === "percent" && r.capCents !== null && r.value > 0) {
      pts.add(new Decimal(r.capCents).times(100).div(r.value).toNumber())
    }
  }
  return [...pts].filter((p) => p >= 0 && p <= MAX_PRICE).sort((a, b) => a - b)
}

/** Coeficientes de g(p) = A·p − B válidos em torno do ponto `probe`. */
function coefficients(ctx: SaleContext, probe: number, target: PriceTarget): { A: Decimal; B: Decimal } {
  let A = new Decimal(1)
  let B = new Decimal(ctx.unitCost.total)
  for (const r of ctx.rules) {
    if (!ruleApplies(r, probe, ctx.weightKg)) continue
    if (r.kind === "fixed") {
      B = B.plus(r.value)
    } else {
      const uncapped = new Decimal(probe).times(r.value).div(100)
      if (r.capCents !== null && uncapped.gt(r.capCents)) B = B.plus(r.capCents)
      else A = A.minus(new Decimal(r.value).div(100))
    }
  }
  if (ctx.tax.enabled && ctx.tax.percent > 0) A = A.minus(new Decimal(ctx.tax.percent).div(100))
  if (ctx.ads.enabled && ctx.ads.value > 0) {
    if (ctx.ads.mode === "percent") A = A.minus(new Decimal(ctx.ads.value).div(100))
    else B = B.plus(toCents(ctx.ads.value))
  }
  if (target.type === "profit") B = B.plus(target.cents)
  if (target.type === "margin") A = A.minus(new Decimal(target.percent).div(100))
  return { A, B }
}

export function solvePrice(ctx: SaleContext, target: PriceTarget): SolveResult {
  const pts = breakpoints(ctx)

  for (let i = 0; i < pts.length; i++) {
    const lo = pts[i]
    const hi = i + 1 < pts.length ? pts[i + 1] : Infinity
    const probe = Number.isFinite(hi) ? (lo + hi) / 2 : lo + 100
    const { A, B } = coefficients(ctx, probe, target)
    let p: Decimal | null = null
    if (A.gt(0)) {
      p = Decimal.max(B.div(A), lo)
    } else if (A.times(lo).minus(B).gte(0)) {
      p = new Decimal(lo)
    }
    if (p === null || (Number.isFinite(hi) && p.gte(hi))) continue

    // Arredonda para cima ao centavo e verifica com o cálculo real (tarifas
    // arredondadas linha a linha). A diferença de arredondamento é de poucos
    // centavos; se o trecho acabar antes, segue para o próximo trecho.
    let price = Math.max(1, ceilCents(p))
    for (let steps = 0; steps < MAX_VERIFY_STEPS && price <= MAX_PRICE; steps++) {
      if (Number.isFinite(hi) && price >= hi) break
      let result = computeSale(ctx, price)
      if (meetsTarget(result, target)) {
        // O arredondamento das tarifas pode permitir alguns centavos a menos: desce enquanto ainda atinge.
        const floor = Math.max(1, Math.ceil(lo))
        for (let back = 0; back < MAX_BACK_STEPS && price - 1 >= floor; back++) {
          const lower = computeSale(ctx, price - 1)
          if (!meetsTarget(lower, target)) break
          price -= 1
          result = lower
        }
        const next = pts.find((x) => x > price)
        return { price, result, nextBreakpoint: next !== undefined ? Math.ceil(next) : null }
      }
      price += 1
    }
  }

  return {
    price: null,
    result: null,
    nextBreakpoint: null,
    reason:
      target.type === "margin"
        ? "Não existe preço que atinja essa margem: comissões percentuais + impostos + margem desejada somam 100% ou mais."
        : "Não existe preço que atinja o objetivo com as taxas configuradas.",
  }
}
