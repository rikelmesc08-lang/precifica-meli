import type { FeeGroup, MarketplaceConfig, MarketplaceSelection } from "@/types"
import { percentOf, toCents, type Cents } from "@/lib/money"

/** Regra pronta para cálculo: limites em centavos, seleções e overrides aplicados. */
export interface ResolvedRule {
  id: string
  label: string
  group: FeeGroup
  kind: "percent" | "fixed"
  /** percent: % · fixed: centavos */
  value: number
  capCents: Cents | null
  minPrice: Cents | null
  maxPrice: Cents | null
  minWeight: number | null
  maxWeight: number | null
  source: "rule" | "category"
  note?: string
}

export interface FeeLine {
  ruleId: string
  label: string
  group: FeeGroup
  kind: "percent" | "fixed"
  /** % aplicado (percentuais) */
  rate?: number
  amount: Cents
  capped: boolean
}

export const CATEGORY_RULE_ID = "__category_commission"

/**
 * Transforma a configuração do marketplace + seleção da análise em uma lista
 * de regras ATIVAS. Cada regra entra uma única vez (dedupe por id), o que
 * impede que uma tarifa seja contada em dobro.
 */
export function resolveRules(config: MarketplaceConfig, selection: MarketplaceSelection = {}): ResolvedRule[] {
  const rules: ResolvedRule[] = []
  const overrides = selection.feeOverrides ?? {}
  const cc = config.categoryCommission

  if (cc && cc.enabled && overrides[CATEGORY_RULE_ID] !== false) {
    const listingId = selection.listingTypeId ?? cc.defaultListingTypeId
    const category = cc.categories.find((c) => c.id === (selection.categoryId ?? cc.defaultCategoryId)) ?? cc.categories[0]
    const listing = cc.listingTypes.find((l) => l.id === listingId) ?? cc.listingTypes[0]
    if (category && listing) {
      const rate = category.rates[listing.id] ?? 0
      rules.push({
        id: CATEGORY_RULE_ID,
        label: `${listing.label} · ${category.name}`,
        group: "commission",
        kind: "percent",
        value: rate,
        capCents: null,
        minPrice: null,
        maxPrice: null,
        minWeight: null,
        maxWeight: null,
        source: "category",
      })
    }
  }

  const seen = new Set<string>()
  for (const r of config.fees) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    const enabled = overrides[r.id] ?? r.enabled
    if (!enabled) continue
    rules.push({
      id: r.id,
      label: r.label,
      group: r.group,
      kind: r.kind,
      value: r.kind === "fixed" ? toCents(r.value) : Number(r.value) || 0,
      capCents: r.kind === "percent" && r.cap !== null && r.cap !== undefined && r.cap > 0 ? toCents(r.cap) : null,
      minPrice: r.minPrice !== null && r.minPrice !== undefined ? toCents(r.minPrice) : null,
      maxPrice: r.maxPrice !== null && r.maxPrice !== undefined ? toCents(r.maxPrice) : null,
      minWeight: r.minWeight ?? null,
      maxWeight: r.maxWeight ?? null,
      source: "rule",
      note: r.note,
    })
  }
  return rules
}

export function hasWeightCondition(rule: ResolvedRule): boolean {
  return rule.minWeight !== null || rule.maxWeight !== null
}

/**
 * Faixa de preço é [min, max). Regras com faixa de peso exigem peso
 * informado — sem peso elas não se aplicam (e o resultado emite um aviso),
 * evitando que várias faixas de peso sejam somadas ao mesmo tempo.
 */
export function ruleApplies(rule: ResolvedRule, price: Cents, weightKg: number | null): boolean {
  if (rule.minPrice !== null && price < rule.minPrice) return false
  if (rule.maxPrice !== null && price >= rule.maxPrice) return false
  if (hasWeightCondition(rule)) {
    if (weightKg === null || weightKg === undefined) return false
    if (rule.minWeight !== null && weightKg < rule.minWeight) return false
    if (rule.maxWeight !== null && weightKg >= rule.maxWeight) return false
  }
  return true
}

/** Uma linha por regra aplicável. Cada linha é arredondada ao centavo uma única vez. */
export function computeFeeLines(rules: ResolvedRule[], price: Cents, weightKg: number | null): FeeLine[] {
  const lines: FeeLine[] = []
  for (const rule of rules) {
    if (!ruleApplies(rule, price, weightKg)) continue
    if (rule.kind === "fixed") {
      if (rule.value === 0) continue
      lines.push({ ruleId: rule.id, label: rule.label, group: rule.group, kind: "fixed", amount: rule.value, capped: false })
    } else {
      if (rule.value === 0) continue
      let amount = percentOf(price, rule.value)
      let capped = false
      if (rule.capCents !== null && amount > rule.capCents) {
        amount = rule.capCents
        capped = true
      }
      lines.push({ ruleId: rule.id, label: rule.label, group: rule.group, kind: "percent", rate: rule.value, amount, capped })
    }
  }
  return lines
}
