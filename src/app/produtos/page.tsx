"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CopyIcon, MoreHorizontalIcon, PackageIcon, PencilIcon, RefreshCwIcon, SearchIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import type { ProductStatus, SavedProduct } from "@/types"
import { classify } from "@/lib/calc"
import { buildSnapshot, createProduct, recalculateProduct } from "@/lib/products"
import { formatDate } from "@/lib/format"
import { useStore } from "@/components/providers/store-provider"
import { EmptyState, MarketplaceName, Money, PageHeader, Pct, Segmented, StatusBadge } from "@/components/app/bits"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type Filter = "all" | ProductStatus

export default function ProductsPage() {
  const { hydrated, products, settings, saveProduct, saveProducts, deleteProduct } = useStore()
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [toDelete, setToDelete] = React.useState<SavedProduct | null>(null)

  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-muted/30" />

  const rows = products
    .map((p) => {
      const current = buildSnapshot(p.input, p.marketplace, settings)
      return { p, status: classify(p.snapshot.profit, p.snapshot.margin, settings.targets), stale: current.profit !== p.snapshot.profit || current.salePrice !== p.snapshot.salePrice }
    })
    .filter(({ p, status }) => {
      const q = query.trim().toLowerCase()
      const matches = !q || [p.input.name, p.input.category, p.input.supplier].some((v) => v?.toLowerCase().includes(q))
      return matches && (filter === "all" || status === filter)
    })
    .sort((a, b) => b.p.updatedAt.localeCompare(a.p.updatedAt))

  const staleCount = products.filter((p) => buildSnapshot(p.input, p.marketplace, settings).profit !== p.snapshot.profit).length

  const duplicate = (p: SavedProduct) => {
    const copy = createProduct({ ...p.input, name: `${p.input.name} (cópia)` }, p.marketplace, settings)
    saveProduct(copy)
    toast.success("Produto duplicado.")
  }

  const recalc = (p: SavedProduct) => {
    saveProduct(recalculateProduct(p, settings))
    toast.success("Recalculado com as taxas atuais.")
  }

  const recalcAll = () => {
    saveProducts((prev) => prev.map((p) => recalculateProduct(p, settings)))
    toast.success(`${products.length} produtos recalculados com as taxas atuais.`)
  }

  const actions = (p: SavedProduct) => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Ações" />}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => router.push(`/analise?id=${p.id}`)}>
          <PencilIcon /> Abrir e editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => duplicate(p)}>
          <CopyIcon /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => recalc(p)}>
          <RefreshCwIcon /> Recalcular
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => setToDelete(p)}>
          <Trash2Icon /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <PageHeader
        eyebrow="Biblioteca"
        title="Produtos"
        description="Análises salvas neste navegador. Lucro, margem e ROI referem-se ao marketplace principal de cada produto."
        actions={
          products.length > 0 && (
            <Button variant="outline" onClick={recalcAll}>
              <RefreshCwIcon data-icon="inline-start" />
              Recalcular todos
            </Button>
          )
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Nenhum produto salvo"
          description="Salve uma análise para guardar custo, preço, lucro, margem e ROI e poder recalcular quando as taxas mudarem."
          action={
            <Link href="/analise" className={buttonVariants()}>
              Nova análise
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {staleCount > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <p className="text-warn">
                {staleCount} produto(s) foram calculados com taxas diferentes das atuais. Os valores exibidos são os do último cálculo.
              </p>
              <Button size="sm" variant="outline" onClick={recalcAll}>
                Recalcular agora
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-80">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-9 bg-input/20 pl-8" placeholder="Buscar por nome, categoria ou fornecedor" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="overflow-x-auto">
              <Segmented
                size="sm"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "loss", label: "Prejuízo" },
                  { value: "below", label: "Abaixo" },
                  { value: "within", label: "Na meta" },
                  { value: "above", label: "Acima" },
                ]}
              />
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Produto", "Marketplace", "Custo real", "Venda", "Lucro/un.", "Margem", "ROI", "Status", "Análise", ""].map((h, i) => (
                    <TableHead key={i} className={`h-10 text-[11px] tracking-wide text-muted-foreground uppercase ${i >= 2 && i <= 6 ? "text-right" : ""} ${i === 0 ? "pl-5" : ""}`}>
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ p, status, stale }) => (
                  <TableRow key={p.id} className="group">
                    <TableCell className="max-w-64 py-3 pl-5">
                      <Link href={`/analise?id=${p.id}`} className="block truncate font-medium hover:underline">
                        {p.input.name}
                      </Link>
                      <p className="truncate text-[11px] text-muted-foreground">{[p.input.category, p.input.supplier].filter(Boolean).join(" · ") || "—"}</p>
                    </TableCell>
                    <TableCell className="text-[13px]">
                      <MarketplaceName id={p.marketplace} name={settings.marketplaces[p.marketplace].name} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money cents={p.snapshot.unitCost} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money cents={p.snapshot.salePrice} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Money cents={p.snapshot.profit} tone />
                    </TableCell>
                    <TableCell className="text-right">
                      <Pct value={p.snapshot.margin} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Pct value={p.snapshot.roi} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {formatDate(p.calculatedAt)}
                        {stale && (
                          <Tooltip>
                            <TooltipTrigger render={<span className="size-1.5 rounded-full bg-warn" />} />
                            <TooltipContent>Taxas mudaram desde este cálculo</TooltipContent>
                          </Tooltip>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="pr-3 text-right">
                      {actions(p)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {rows.map(({ p, status, stale }) => (
              <div key={p.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/analise?id=${p.id}`} className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.input.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <MarketplaceName id={p.marketplace} name={settings.marketplaces[p.marketplace].name} /> · {formatDate(p.calculatedAt)}
                      {stale && <span className="text-warn">· taxas mudaram</span>}
                    </p>
                  </Link>
                  {actions(p)}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Lucro/un.</p>
                    <Money cents={p.snapshot.profit} tone className="font-medium" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Margem</p>
                    <Pct value={p.snapshot.margin} />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">ROI</p>
                    <Pct value={p.snapshot.roi} />
                  </div>
                </div>
                <StatusBadge status={status} className="mt-3" />
              </div>
            ))}
          </div>

          {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhum produto corresponde ao filtro.</p>}
        </div>
      )}

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{toDelete?.input.name}”?</AlertDialogTitle>
            <AlertDialogDescription>A análise será removida deste navegador. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (toDelete) deleteProduct(toDelete.id)
                setToDelete(null)
                toast.success("Produto excluído.")
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
