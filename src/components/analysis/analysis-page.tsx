"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalculatorIcon, FilePlus2Icon, SaveIcon } from "lucide-react"
import { toast } from "sonner"
import { MARKETPLACE_IDS, type AnalysisInput, type MarketplaceId } from "@/types"
import { createEmptyAnalysis } from "@/config/defaults"
import { analyze, computeUnitCost, highlights, type SaleContext } from "@/lib/calc"
import { storage } from "@/lib/storage"
import { buildSnapshot, createProduct } from "@/lib/products"
import { formatBRL } from "@/lib/format"
import { useStore } from "@/components/providers/store-provider"
import { EmptyState, PageHeader } from "@/components/app/bits"
import { AppSelect } from "@/components/app/app-select"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AnalysisForm } from "./analysis-form"
import { MarketplaceCard } from "./marketplace-card"
import { ComparisonTable, highlightLabels } from "./comparison-table"
import { TargetPrice } from "./target-price"
import { PriceSimulator } from "./price-simulator"
import { Scenarios } from "./scenarios"

function UnitCostSummary({ input }: { input: AnalysisInput }) {
  const u = computeUnitCost(input.cost)
  const parts = [
    { label: "Produto", value: u.product },
    { label: "Frete rateado", value: u.freight },
    { label: "Embalagem", value: u.packaging },
    { label: "Outros", value: u.other },
  ]
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Custo real por unidade</p>
          <p className="num mt-1 text-4xl font-semibold tracking-tight">{formatBRL(u.total)}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-4">
          {parts.map((p, i) => (
            <div key={p.label} className="flex items-baseline gap-1.5 sm:block">
              <p className="text-[11px] text-muted-foreground">
                {i > 0 && <span className="mr-1 hidden text-foreground/40 sm:inline">+</span>}
                {p.label}
              </p>
              <p className="num">{formatBRL(p.value)}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 border-t border-dashed pt-3 text-[11px] text-muted-foreground">
        Custo real = preço do fornecedor + frete rateado + embalagem + outros custos. Margem e ROI são sempre calculados sobre este valor, nunca só sobre o preço do fornecedor.
      </p>
    </div>
  )
}

export function AnalysisPage() {
  const { hydrated, settings, products, saveProduct } = useStore()
  const params = useSearchParams()
  const router = useRouter()
  const productId = params.get("id")

  const [input, setInput] = React.useState<AnalysisInput | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [saveMarketplace, setSaveMarketplace] = React.useState<MarketplaceId>("mercadolivre")
  const loadedFor = React.useRef<string | null | undefined>(undefined)
  // Muda a cada carga/limpeza para remontar o formulário e reiniciar seu estado local
  // (ex.: o interruptor "Preço por marketplace" ficava ligado após clicar em "Nova").
  const [formKey, setFormKey] = React.useState(0)

  // Carrega: produto (?id=), rascunho ou análise em branco.
  React.useEffect(() => {
    if (!hydrated || loadedFor.current === productId) return
    loadedFor.current = productId
    const product = productId ? products.find((p) => p.id === productId) : null
    /* eslint-disable react-hooks/set-state-in-effect */
    if (product) {
      setInput(structuredClone(product.input))
      setEditingId(product.id)
      setSaveMarketplace(product.marketplace)
    } else {
      setInput(storage.loadDraft() ?? createEmptyAnalysis(settings))
      setEditingId(null)
    }
    setFormKey((k) => k + 1)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [hydrated, productId, products, settings])

  // Rascunho automático (apenas para análises novas).
  React.useEffect(() => {
    if (!input || editingId) return
    const t = setTimeout(() => storage.saveDraft(input), 300)
    return () => clearTimeout(t)
  }, [input, editingId])

  const update = React.useCallback((fn: (draft: AnalysisInput) => void) => {
    setInput((prev) => {
      if (!prev) return prev
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const result = React.useMemo(() => (input ? analyze(input, settings) : null), [input, settings])

  if (!input || !result) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted/30" />
  }

  const sales = { mercadolivre: result.mercadolivre.sale, shopee: result.shopee.sale, tiktok: result.tiktok.sale }
  const contexts = Object.fromEntries(MARKETPLACE_IDS.map((id) => [id, result[id].ctx])) as Record<MarketplaceId, SaleContext>
  const hasPrice = MARKETPLACE_IDS.some((id) => sales[id].price > 0)
  const hasCost = sales.mercadolivre.unitCost.total > 0
  const labels = highlightLabels(sales)

  const openSave = () => {
    if (!input.name.trim()) {
      toast.error("Dê um nome ao produto antes de salvar.")
      document.getElementById("name")?.focus()
      return
    }
    if (!editingId) setSaveMarketplace(highlights(sales).maxProfit[0] ?? "mercadolivre")
    setSaveOpen(true)
  }

  const confirmSave = () => {
    const existing = editingId ? products.find((p) => p.id === editingId) : null
    if (existing) {
      const now = new Date().toISOString()
      saveProduct({ ...existing, input: structuredClone(input), marketplace: saveMarketplace, updatedAt: now, calculatedAt: now, snapshot: buildSnapshot(input, saveMarketplace, settings) })
      toast.success("Análise atualizada.")
    } else {
      const product = createProduct(input, saveMarketplace, settings)
      saveProduct(product)
      storage.saveDraft(null)
      setEditingId(product.id)
      loadedFor.current = product.id
      router.replace(`/analise?id=${product.id}`)
      toast.success("Produto salvo.", { description: "Disponível em Produtos." })
    }
    setSaveOpen(false)
  }

  const newAnalysis = () => {
    storage.saveDraft(null)
    setInput(createEmptyAnalysis(settings))
    setEditingId(null)
    setFormKey((k) => k + 1)
    loadedFor.current = null
    router.replace("/analise")
  }

  return (
    <>
      <PageHeader
        eyebrow={editingId ? "Editando produto salvo" : "Análise"}
        title={editingId ? input.name || "Produto" : "Nova análise"}
        description="Informe o custo e o preço pretendido. Os resultados atualizam a cada tecla, usando as taxas definidas em Configurações."
        actions={
          <>
            <Button variant="outline" onClick={newAnalysis}>
              <FilePlus2Icon data-icon="inline-start" />
              Nova
            </Button>
            <Button onClick={openSave}>
              <SaveIcon data-icon="inline-start" />
              {editingId ? "Salvar alterações" : "Salvar análise"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:self-start xl:overflow-y-auto xl:pb-2 [scrollbar-width:thin]">
          <AnalysisForm key={formKey} input={input} update={update} settings={settings} />
        </div>

        <div className="min-w-0 space-y-6">
          <UnitCostSummary input={input} />

          <Tabs defaultValue="resultado">
            <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              <TabsList className="h-9">
                <TabsTrigger value="resultado" className="px-3">Resultado</TabsTrigger>
                <TabsTrigger value="comparacao" className="px-3">Comparação</TabsTrigger>
                <TabsTrigger value="preco" className="px-3">Preço ideal</TabsTrigger>
                <TabsTrigger value="simulador" className="px-3">Faixa de preços</TabsTrigger>
                <TabsTrigger value="cenarios" className="px-3">Cenários</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="resultado" className="mt-4">
              {hasPrice ? (
                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1 wide:grid-cols-3">
                  {MARKETPLACE_IDS.map((id, i) => (
                    <MarketplaceCard key={id} index={i} id={id} sale={sales[id]} breakeven={result[id].breakeven} targets={settings.targets} tax={input.tax} ads={input.ads} highlights={labels[id]} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={CalculatorIcon} title="Informe o preço de venda pretendido" description="Com o custo e o preço, os três marketplaces são calculados lado a lado. Sem preço definido? Use a aba “Preço ideal”." />
              )}
            </TabsContent>
            <TabsContent value="comparacao" className="mt-4">
              <ComparisonTable results={sales} />
            </TabsContent>
            <TabsContent value="preco" className="mt-4">
              <TargetPrice contexts={contexts} defaultMargin={settings.targets.minMargin} />
            </TabsContent>
            <TabsContent value="simulador" className="mt-4">
              {hasCost ? <PriceSimulator contexts={contexts} /> : <EmptyState icon={CalculatorIcon} title="Informe o custo do produto" description="A simulação usa o custo real por unidade." />}
            </TabsContent>
            <TabsContent value="cenarios" className="mt-4">
              <Scenarios contexts={contexts} basePrice={input.salePrice || 0} baseQuantity={input.cost.quantity} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Salvar alterações" : "Salvar análise"}</DialogTitle>
            <DialogDescription>Escolha o marketplace principal. Lucro, margem e ROI do produto salvo serão os desse marketplace; os três continuam disponíveis ao abrir a análise.</DialogDescription>
          </DialogHeader>
          <AppSelect value={saveMarketplace} onChange={setSaveMarketplace} options={MARKETPLACE_IDS.map((id) => ({ value: id, label: `${settings.marketplaces[id].name} · lucro ${formatBRL(sales[id].profit)}` }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
