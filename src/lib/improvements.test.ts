import { afterEach, describe, expect, it, vi } from "vitest"
import { createDefaultSettings, createEmptyAnalysis } from "@/config/defaults"
import { DEFAULT_MARKETPLACES } from "@/config/marketplaces"
import { SITE_ROUTES, SITE_URL } from "@/config/site"
import { computeSale, computeUnitCost, resolveRules } from "@/lib/calc"
import { toCents } from "@/lib/money"
import { createProduct, isSnapshotStale } from "@/lib/products"
import { storage } from "@/lib/storage"
import sitemap from "@/app/sitemap"
import robots from "@/app/robots"

const NO_TAX = { enabled: false, percent: 0 }
const NO_ADS = { enabled: false, mode: "fixed" as const, value: 0 }

function tiktokSale(priceReais: number) {
  const unitCost = computeUnitCost({ supplierPrice: 0, quantity: 1, freightMode: "total", freightTotal: 0, freightUnit: 0, packagingUnit: 0, otherUnit: 0, weightKg: null })
  return computeSale({ rules: resolveRules(DEFAULT_MARKETPLACES.tiktok), unitCost, weightKg: null, tax: NO_TAX, ads: NO_ADS }, toCents(priceReais))
}

// Valores confirmados em 09/10/2026 na página oficial "Tarifa de Comissão da Plataforma"
// (seller-br.tiktok.com/university/essay?knowledge_id=24428156307201), vigência 15/07/2026.
describe("TikTok Shop: tarifas padrão = página oficial (conferida em 09/10/2026)", () => {
  it("abaixo de R$ 50: comissão 10% + R$ 4,00 por item (exemplo oficial R$ 45,00)", () => {
    const r = tiktokSale(45)
    expect(r.commission).toBe(450)
    expect(r.fixedFees).toBe(400)
  })

  it("a partir de R$ 50: comissão 6% + R$ 6,00 por item (exemplo oficial R$ 85,00)", () => {
    const r = tiktokSale(85)
    expect(r.commission).toBe(510)
    expect(r.fixedFees).toBe(600)
  })

  it("R$ 50,00 exatos já usam a regra de R$ 50 ou mais", () => {
    const r = tiktokSale(50)
    expect(r.commission).toBe(300)
    expect(r.fixedFees).toBe(600)
  })

  it("a fonte oficial lida registra a data de consulta", () => {
    const official = DEFAULT_MARKETPLACES.tiktok.sources.find((s) => s.url.includes("seller-br.tiktok.com"))
    expect(official?.consultedAt).toBe("2026-10-09")
  })
})

describe("produtos: snapshot desatualizado", () => {
  it("detecta mudança de taxa que altera o lucro e não acusa quando nada mudou", () => {
    const settings = createDefaultSettings()
    const input = createEmptyAnalysis(settings)
    input.name = "Teste"
    input.cost.supplierPrice = 20
    input.salePrice = 60
    const product = createProduct(input, "tiktok", settings)
    expect(isSnapshotStale(product, settings)).toBe(false)

    const changed = structuredClone(settings)
    changed.marketplaces.tiktok.fees.find((f) => f.id === "tt-fixed-b")!.value = 7
    expect(isSnapshotStale(product, changed)).toBe(true)
  })

  it("acusa snapshot com preço diferente mesmo se o lucro coincidir", () => {
    const settings = createDefaultSettings()
    const input = createEmptyAnalysis(settings)
    input.salePrice = 60
    const product = createProduct(input, "shopee", settings)
    const tampered = { ...product, snapshot: { ...product.snapshot, salePrice: product.snapshot.salePrice + 1 } }
    expect(isSnapshotStale(tampered, settings)).toBe(true)
  })
})

describe("storage tolerante a falhas", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("limpar o rascunho não quebra quando o LocalStorage está bloqueado", () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError")
      },
      setItem: () => {
        throw new Error("SecurityError")
      },
      removeItem: () => {
        throw new Error("SecurityError")
      },
    }
    vi.stubGlobal("window", { localStorage: blocked })
    expect(() => storage.saveDraft(null)).not.toThrow()
    expect(storage.loadDraft()).toBeNull()
  })
})

describe("SEO: sitemap e robots", () => {
  it("sitemap usa URLs absolutas da URL canônica e não lista páginas noindex", () => {
    const urls = sitemap().map((e) => e.url)
    expect(urls.length).toBe(SITE_ROUTES.length)
    for (const u of urls) expect(u.startsWith(SITE_URL + "/")).toBe(true)
    expect(urls.some((u) => u.includes("/produtos"))).toBe(false)
    expect(urls.some((u) => u.includes("/configuracoes"))).toBe(false)
  })

  it("robots aponta para o sitemap", () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`)
  })
})
