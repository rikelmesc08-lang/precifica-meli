import type { AnalysisInput, Settings } from "@/types"
import { DEFAULT_MARKETPLACES } from "./marketplaces"

export const SETTINGS_VERSION = 1

export function createDefaultSettings(): Settings {
  return structuredClone({
    version: SETTINGS_VERSION,
    marketplaces: DEFAULT_MARKETPLACES,
    // Imposto desativado por padrão: não presumimos regime tributário.
    tax: { enabled: false, percent: 0 },
    ads: { enabled: false, mode: "fixed", value: 0 },
    targets: { minMargin: 15, highMargin: 25 },
  } satisfies Settings)
}

export function createEmptyAnalysis(settings: Settings): AnalysisInput {
  const ml = settings.marketplaces.mercadolivre.categoryCommission
  return {
    name: "",
    category: "",
    supplier: "",
    cost: {
      supplierPrice: 0,
      quantity: 1,
      freightMode: "total",
      freightTotal: 0,
      freightUnit: 0,
      packagingUnit: 0,
      otherUnit: 0,
      weightKg: null,
    },
    salePrice: 0,
    priceOverrides: {},
    selections: {
      mercadolivre: { listingTypeId: ml?.defaultListingTypeId, categoryId: ml?.defaultCategoryId, feeOverrides: {} },
      shopee: { feeOverrides: {} },
      tiktok: { feeOverrides: {} },
    },
    tax: { ...settings.tax },
    ads: { ...settings.ads },
  }
}
