"use client"

import * as React from "react"
import type { SavedProduct, Settings } from "@/types"
import { createDefaultSettings } from "@/config/defaults"
import { storage } from "@/lib/storage"

interface StoreValue {
  hydrated: boolean
  settings: Settings
  setSettings: (updater: Settings | ((prev: Settings) => Settings)) => void
  resetSettings: () => void
  products: SavedProduct[]
  saveProduct: (product: SavedProduct) => void
  saveProducts: (updater: (prev: SavedProduct[]) => SavedProduct[]) => void
  deleteProduct: (id: string) => void
}

const StoreContext = React.createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = React.useState(false)
  const [settings, setSettingsState] = React.useState<Settings>(createDefaultSettings)
  const [products, setProducts] = React.useState<SavedProduct[]>([])

  React.useEffect(() => {
    // LocalStorage só existe no navegador: carrega após montar para evitar divergência de hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettingsState(storage.loadSettings())
    setProducts(storage.loadProducts())
    setHydrated(true)
  }, [])

  const setSettings = React.useCallback((updater: Settings | ((prev: Settings) => Settings)) => {
    setSettingsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      storage.saveSettings(next)
      return next
    })
  }, [])

  const saveProducts = React.useCallback((updater: (prev: SavedProduct[]) => SavedProduct[]) => {
    setProducts((prev) => {
      const next = updater(prev)
      storage.saveProducts(next)
      return next
    })
  }, [])

  const value = React.useMemo<StoreValue>(
    () => ({
      hydrated,
      settings,
      setSettings,
      resetSettings: () => setSettings(createDefaultSettings()),
      products,
      saveProducts,
      saveProduct: (product) =>
        saveProducts((prev) => {
          const idx = prev.findIndex((p) => p.id === product.id)
          if (idx === -1) return [product, ...prev]
          const copy = [...prev]
          copy[idx] = product
          return copy
        }),
      deleteProduct: (id) => saveProducts((prev) => prev.filter((p) => p.id !== id)),
    }),
    [hydrated, settings, setSettings, products, saveProducts],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>")
  return ctx
}
