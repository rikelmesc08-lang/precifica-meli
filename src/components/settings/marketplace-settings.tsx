"use client"

import * as React from "react"
import { BadgeCheckIcon, ExternalLinkIcon, PlusIcon, RotateCcwIcon, SlidersHorizontalIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"
import type { FeeGroup, FeeRule, MarketplaceConfig, MarketplaceId } from "@/types"
import { DEFAULT_MARKETPLACES } from "@/config/marketplaces"
import { formatDate, formatDateTime } from "@/lib/format"
import { newId } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { useStore } from "@/components/providers/store-provider"
import { Field, MarketplaceName, Section } from "@/components/app/bits"
import { NumberField } from "@/components/app/number-field"
import { AppSelect } from "@/components/app/app-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

const GROUPS: { value: FeeGroup; label: string }[] = [
  { value: "commission", label: "Comissão" },
  { value: "fixed", label: "Tarifa fixa" },
  { value: "logistics", label: "Logística / frete" },
  { value: "other", label: "Outras taxas" },
]

function FeeRuleRow({ rule, onChange, onDelete }: { rule: FeeRule; onChange: (r: FeeRule) => void; onDelete: () => void }) {
  const [advanced, setAdvanced] = React.useState(rule.minWeight != null || rule.maxWeight != null || (rule.cap ?? 0) > 0)
  const patch = (p: Partial<FeeRule>) => onChange({ ...rule, ...p })
  const invalidRange = rule.minPrice !== null && rule.maxPrice !== null && rule.maxPrice <= rule.minPrice
  return (
    <div className={cn("rounded-lg border bg-background/30 p-4 transition-opacity", !rule.enabled && "opacity-60")}>
      <div className="flex items-start gap-3">
        <Switch checked={rule.enabled} onCheckedChange={(v) => patch({ enabled: v })} className="mt-2" aria-label="Ativar regra" />
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nome da cobrança" className="sm:col-span-2">
            <Input aria-label="Nome da cobrança" className="h-9 bg-input/20" value={rule.label} onChange={(e) => patch({ label: e.target.value })} />
          </Field>
          <Field label="Aparece como">
            <AppSelect value={rule.group} onChange={(v) => patch({ group: v })} options={GROUPS} />
          </Field>
          <Field label="Tipo">
            <AppSelect
              value={rule.kind}
              onChange={(v) => patch({ kind: v, cap: v === "fixed" ? null : rule.cap })}
              options={[
                { value: "percent", label: "% do preço" },
                { value: "fixed", label: "R$ por unidade" },
              ]}
            />
          </Field>
          <Field label="Valor">
            <NumberField value={rule.value} onChange={(v) => patch({ value: v ?? 0 })} prefix={rule.kind === "fixed" ? "R$" : undefined} suffix={rule.kind === "percent" ? "%" : undefined} />
          </Field>
          <Field label="Preço a partir de (inclusive)">
            <NumberField value={rule.minPrice} onChange={(v) => patch({ minPrice: v })} prefix="R$" placeholder="Sem mínimo" />
          </Field>
          <Field label="Preço abaixo de (exclusive)">
            <NumberField value={rule.maxPrice} onChange={(v) => patch({ maxPrice: v })} prefix="R$" placeholder="Sem máximo" />
          </Field>
          {advanced && (
            <>
              {rule.kind === "percent" && (
                <Field label="Teto por unidade">
                  <NumberField value={rule.cap ?? null} onChange={(v) => patch({ cap: v && v > 0 ? v : null })} prefix="R$" placeholder="Sem teto" />
                </Field>
              )}
              <Field label="Peso a partir de (kg)">
                <NumberField value={rule.minWeight ?? null} onChange={(v) => patch({ minWeight: v })} decimals={3} placeholder="—" />
              </Field>
              <Field label="Peso abaixo de (kg)">
                <NumberField value={rule.maxWeight ?? null} onChange={(v) => patch({ maxWeight: v })} decimals={3} placeholder="—" />
              </Field>
            </>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setAdvanced((a) => !a)} aria-label="Opções avançadas" className={cn(advanced && "bg-muted")}>
            <SlidersHorizontalIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Excluir regra" className="text-muted-foreground hover:text-destructive">
            <Trash2Icon />
          </Button>
        </div>
      </div>
      {(rule.note || invalidRange || (rule.enabled && rule.value === 0)) && (
        <div className="mt-3 space-y-1 pl-12 text-[11px] leading-relaxed">
          {rule.note && <p className="text-muted-foreground">{rule.note}</p>}
          {invalidRange && (
            <p className="flex items-center gap-1.5 text-loss">
              <TriangleAlertIcon className="size-3" /> O limite superior precisa ser maior que o inferior — esta regra nunca será aplicada.
            </p>
          )}
          {rule.enabled && rule.value === 0 && (
            <p className="flex items-center gap-1.5 text-warn">
              <TriangleAlertIcon className="size-3" /> Ativa com valor zero: informe o valor para que entre no cálculo.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function MarketplaceSettings({ id }: { id: MarketplaceId }) {
  const { settings, setSettings } = useStore()
  const config = settings.marketplaces[id]
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [resetOpen, setResetOpen] = React.useState(false)

  const update = (fn: (c: MarketplaceConfig) => void, markEdited = true) =>
    setSettings((prev) => {
      const c = structuredClone(prev.marketplaces[id])
      fn(c)
      if (markEdited) {
        c.lastUpdatedAt = new Date().toISOString()
        c.lastUpdatedNote = "Editado manualmente em Configurações."
      }
      return { ...prev, marketplaces: { ...prev.marketplaces, [id]: c } }
    })

  const cc = config.categoryCommission

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 flex size-8 items-center justify-center rounded-full", config.lastUpdatedAt ? "bg-profit/12 text-profit" : "bg-warn/12 text-warn")}>
            {config.lastUpdatedAt ? <BadgeCheckIcon className="size-4" /> : <TriangleAlertIcon className="size-4" />}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Última atualização das taxas</p>
            {config.lastUpdatedAt ? (
              <>
                <p className="text-sm font-medium">{formatDateTime(config.lastUpdatedAt)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{config.lastUpdatedNote}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Ainda não confirmada por você</p>
                <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Os valores atuais são uma referência inicial tirada das fontes listadas abaixo. Nada é verificado automaticamente — confira na central do vendedor e confirme.
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setResetOpen(true)}>
            <RotateCcwIcon data-icon="inline-start" />
            Restaurar padrão
          </Button>
          <Button
            onClick={() => {
              setNote("")
              setConfirmOpen(true)
            }}
          >
            <BadgeCheckIcon data-icon="inline-start" />
            Confirmar taxas
          </Button>
        </div>
      </div>

      {cc && (
        <Section
          title="Comissão por categoria e tipo de anúncio"
          description="A comissão aplicada depende da categoria e do tipo de anúncio escolhidos em cada análise."
          action={
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Ativa
              <Switch aria-label="Ativar comissão por categoria" checked={cc.enabled} onCheckedChange={(v) => update((c) => void (c.categoryCommission!.enabled = v))} />
            </label>
          }
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <Field label="Tipo de anúncio padrão">
              <AppSelect value={cc.defaultListingTypeId} onChange={(v) => update((c) => void (c.categoryCommission!.defaultListingTypeId = v))} options={cc.listingTypes.map((l) => ({ value: l.id, label: l.label }))} />
            </Field>
            <Field label="Categoria padrão">
              <AppSelect value={cc.defaultCategoryId} onChange={(v) => update((c) => void (c.categoryCommission!.defaultCategoryId = v))} options={cc.categories.map((c) => ({ value: c.id, label: c.name }))} />
            </Field>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-3 py-2 text-left font-medium">Categoria</th>
                  {cc.listingTypes.map((l) => (
                    <th key={l.id} className="w-36 px-3 py-2 text-left font-medium">
                      {l.label}
                    </th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {cc.categories.map((cat, idx) => (
                  <tr key={cat.id}>
                    <td className="px-2 py-1.5">
                      <Input className="h-8 border-transparent bg-transparent hover:border-input focus-visible:border-ring" value={cat.name} onChange={(e) => update((c) => void (c.categoryCommission!.categories[idx].name = e.target.value))} />
                    </td>
                    {cc.listingTypes.map((l) => (
                      <td key={l.id} className="px-2 py-1.5">
                        <NumberField className="h-8" value={cat.rates[l.id] ?? 0} onChange={(v) => update((c) => void (c.categoryCommission!.categories[idx].rates[l.id] = v ?? 0))} suffix="%" />
                      </td>
                    ))}
                    <td className="pr-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remover categoria"
                        disabled={cc.categories.length <= 1}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          update((c) => {
                            const k = c.categoryCommission!
                            k.categories.splice(idx, 1)
                            if (!k.categories.some((x) => x.id === k.defaultCategoryId)) k.defaultCategoryId = k.categories[0].id
                          })
                        }
                      >
                        <Trash2Icon />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() =>
              update((c) =>
                c.categoryCommission!.categories.push({ id: newId(), name: "Nova categoria", rates: Object.fromEntries(cc.listingTypes.map((l) => [l.id, 0])) }),
              )
            }
          >
            <PlusIcon data-icon="inline-start" />
            Adicionar categoria
          </Button>
        </Section>
      )}

      <Section
        title="Tarifas e cobranças"
        description="Cada regra vale para a faixa de preço [a partir de, abaixo de). Use faixas para regras diferentes conforme o preço — ex.: regra A abaixo de R$ 50 e regra B a partir de R$ 50."
      >
        <div className="space-y-3">
          {config.fees.map((rule, idx) => (
            <FeeRuleRow
              key={rule.id}
              rule={rule}
              onChange={(r) => update((c) => void (c.fees[idx] = r))}
              onDelete={() => update((c) => void c.fees.splice(idx, 1))}
            />
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() =>
            update((c) =>
              c.fees.push({ id: newId(), label: "Taxa personalizada", group: "other", kind: "fixed", value: 0, enabled: true, minPrice: null, maxPrice: null, cap: null, custom: true }),
            )
          }
        >
          <PlusIcon data-icon="inline-start" />
          Adicionar taxa personalizada
        </Button>
      </Section>

      <Section title="Fontes da referência inicial" description="Páginas usadas para montar os valores padrão. Sem data = página oficial indicada para conferência, cujo conteúdo não foi lido.">
        <ul className="space-y-2">
          {config.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="group inline-flex items-start gap-2 text-sm text-foreground/85 hover:text-foreground">
                <ExternalLinkIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                <span>
                  {s.label}
                  <span className="ml-2 text-xs text-muted-foreground">{s.consultedAt ? `consultada em ${formatDate(s.consultedAt + "T12:00:00")}` : "não consultada"}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirmar taxas · <MarketplaceName id={id} name={config.name} />
            </DialogTitle>
            <DialogDescription>Registre que você conferiu estes valores hoje. A data fica visível em todas as análises.</DialogDescription>
          </DialogHeader>
          <Field label="Onde você conferiu? (opcional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Central do vendedor, simulador de custos, anúncio X" className="bg-input/20" />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                update((c) => {
                  c.lastUpdatedAt = new Date().toISOString()
                  c.lastUpdatedNote = note.trim() ? `Conferido pelo usuário: ${note.trim()}` : "Conferido pelo usuário."
                }, false)
                setConfirmOpen(false)
                toast.success("Taxas confirmadas.")
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar taxas padrão de {config.name}?</AlertDialogTitle>
            <AlertDialogDescription>Todas as regras, categorias e taxas personalizadas deste marketplace voltam à referência inicial. A data de atualização volta para “não confirmada”.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setSettings((prev) => ({ ...prev, marketplaces: { ...prev.marketplaces, [id]: structuredClone(DEFAULT_MARKETPLACES[id]) } }))
                setResetOpen(false)
                toast.success("Taxas restauradas.")
              }}
            >
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
