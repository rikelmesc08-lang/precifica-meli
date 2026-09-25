import { MARKETPLACE_IDS, type AnalysisInput, type SavedProduct, type Settings } from "@/types"
import { createDefaultSettings, SETTINGS_VERSION } from "@/config/defaults"

/**
 * Persistência local (LocalStorage). Toda leitura é tolerante a falhas:
 * dados ausentes/corrompidos voltam para os padrões sem quebrar a aplicação.
 */
const KEYS = {
  settings: "precifica:v1:settings",
  products: "precifica:v1:products",
  draft: "precifica:v1:draft",
} as const

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Armazenamento cheio ou bloqueado: a sessão continua funcionando em memória.
  }
}

/** Garante que configurações antigas ganhem campos novos sem perder o que o usuário editou. */
export function normalizeSettings(stored: Partial<Settings> | null): Settings {
  const defaults = createDefaultSettings()
  if (!stored || typeof stored !== "object") return defaults
  const marketplaces = { ...defaults.marketplaces }
  for (const id of MARKETPLACE_IDS) {
    const s = stored.marketplaces?.[id]
    if (s && Array.isArray(s.fees)) marketplaces[id] = { ...defaults.marketplaces[id], ...s, id }
  }
  return {
    version: SETTINGS_VERSION,
    marketplaces,
    tax: { ...defaults.tax, ...stored.tax },
    ads: { ...defaults.ads, ...stored.ads },
    targets: { ...defaults.targets, ...stored.targets },
  }
}

export const storage = {
  loadSettings: (): Settings => normalizeSettings(read<Settings>(KEYS.settings)),
  saveSettings: (s: Settings) => write(KEYS.settings, s),
  loadProducts: (): SavedProduct[] => {
    const list = read<SavedProduct[]>(KEYS.products)
    return Array.isArray(list) ? list.filter((p) => p && p.id && p.input) : []
  },
  saveProducts: (p: SavedProduct[]) => write(KEYS.products, p),
  loadDraft: (): AnalysisInput | null => read<AnalysisInput>(KEYS.draft),
  saveDraft: (d: AnalysisInput | null) => (d ? write(KEYS.draft, d) : window.localStorage.removeItem(KEYS.draft)),
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}
