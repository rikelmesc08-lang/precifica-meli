/**
 * Tipos de domínio. Valores de configuração e de formulário ficam em REAIS
 * (como o usuário digita); o motor converte para centavos antes de calcular.
 */

export type MarketplaceId = "mercadolivre" | "shopee" | "tiktok"
export const MARKETPLACE_IDS: MarketplaceId[] = ["mercadolivre", "shopee", "tiktok"]

/** Onde a cobrança aparece no detalhamento. */
export type FeeGroup = "commission" | "fixed" | "logistics" | "other"

export interface FeeRule {
  id: string
  label: string
  group: FeeGroup
  /** percent: % sobre o preço de venda · fixed: R$ por unidade vendida */
  kind: "percent" | "fixed"
  value: number
  enabled: boolean
  /** Faixa de preço de venda em que a regra vale: [minPrice, maxPrice). null = sem limite. */
  minPrice: number | null
  maxPrice: number | null
  /** Faixa de peso (kg) em que a regra vale: [minWeight, maxWeight). Só é avaliada se o peso for informado. */
  minWeight?: number | null
  maxWeight?: number | null
  /** Teto em R$ para cobranças percentuais. null = sem teto. */
  cap?: number | null
  note?: string
  /** Regra personalizada criada pelo usuário (pode ser excluída). */
  custom?: boolean
}

export interface ListingType {
  id: string
  label: string
}

export interface CategoryCommission {
  id: string
  name: string
  /** Comissão % por tipo de anúncio (chave = ListingType.id) */
  rates: Record<string, number>
}

export interface SourceRef {
  label: string
  url: string
  /** Data (ISO) em que a fonte foi realmente consultada. null = link para conferência, conteúdo não lido. */
  consultedAt: string | null
}

export interface MarketplaceConfig {
  id: MarketplaceId
  name: string
  /** Comissão por categoria × tipo de anúncio (Mercado Livre). Se ausente, a comissão vem das regras. */
  categoryCommission?: {
    enabled: boolean
    listingTypes: ListingType[]
    categories: CategoryCommission[]
    defaultListingTypeId: string
    defaultCategoryId: string
  }
  fees: FeeRule[]
  sources: SourceRef[]
  /** Última atualização CONFIRMADA pelo usuário (null = nunca confirmada). */
  lastUpdatedAt: string | null
  lastUpdatedNote: string
}

export interface TaxSettings {
  enabled: boolean
  /** % sobre o preço de venda */
  percent: number
}

export interface AdsSettings {
  enabled: boolean
  /** fixed = CPA em R$ por venda · percent = % do preço (ACOS/TACOS) */
  mode: "fixed" | "percent"
  value: number
}

export interface TargetSettings {
  /** Margem líquida mínima desejada (%) */
  minMargin: number
  /** A partir desta margem o produto é classificado "acima da meta" */
  highMargin: number
}

export interface Settings {
  version: number
  marketplaces: Record<MarketplaceId, MarketplaceConfig>
  tax: TaxSettings
  ads: AdsSettings
  targets: TargetSettings
}

/** Dados de custo informados no formulário (em reais). */
export interface CostInput {
  supplierPrice: number
  quantity: number
  freightMode: "total" | "unit"
  freightTotal: number
  freightUnit: number
  packagingUnit: number
  otherUnit: number
  weightKg: number | null
}

/** Seleções de cada marketplace para uma análise. */
export interface MarketplaceSelection {
  listingTypeId?: string
  categoryId?: string
  /** Liga/desliga regras nesta análise sem alterar a configuração global. */
  feeOverrides?: Record<string, boolean>
}

export interface AnalysisInput {
  name: string
  category: string
  supplier: string
  cost: CostInput
  salePrice: number
  /** Preço de venda diferente por marketplace (opcional). */
  priceOverrides: Partial<Record<MarketplaceId, number | null>>
  selections: Record<MarketplaceId, MarketplaceSelection>
  tax: TaxSettings
  ads: AdsSettings
}

export type ProductStatus = "loss" | "below" | "within" | "above"

export interface SavedProduct {
  id: string
  input: AnalysisInput
  /** Marketplace principal escolhido para este produto. */
  marketplace: MarketplaceId
  createdAt: string
  updatedAt: string
  /** Data do último cálculo (salvar ou recalcular). */
  calculatedAt: string
  snapshot: {
    salePrice: number // centavos
    unitCost: number // centavos
    profit: number // centavos
    margin: number | null
    roi: number | null
    status: ProductStatus
  }
}
