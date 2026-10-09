"use client"

import * as React from "react"
import { DownloadIcon, MegaphoneIcon, PercentIcon, RotateCcwIcon, TargetIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import type { SavedProduct, Settings } from "@/types"
import { normalizeSettings } from "@/lib/storage"
import { formatPercent } from "@/lib/format"
import { useStore } from "@/components/providers/store-provider"
import { Field, Section, Segmented } from "@/components/app/bits"
import { NumberField } from "@/components/app/number-field"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { StatusBadge } from "@/components/app/bits"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export function GeneralSettings() {
  const { settings, setSettings, resetSettings, products, saveProducts } = useStore()
  const [resetOpen, setResetOpen] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const set = (fn: (s: Settings) => void) =>
    setSettings((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })

  const t = settings.targets
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), settings, products }, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `precifica-meli-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as { settings?: Settings; products?: SavedProduct[] }
      if (data.settings) setSettings(normalizeSettings(data.settings))
      if (Array.isArray(data.products)) saveProducts(() => data.products!.filter((p) => p && p.id && p.input))
      toast.success("Backup importado.")
    } catch {
      toast.error("Arquivo inválido.")
    }
  }

  return (
    <div className="space-y-6">
      <Section icon={TargetIcon} title="Metas de margem" description="Definem a classificação dos produtos. A margem é líquida: lucro ÷ preço de venda.">
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
          <Field label="Margem mínima desejada">
            <NumberField value={t.minMargin} onChange={(v) => set((s) => void (s.targets.minMargin = v ?? 0))} suffix="%" />
          </Field>
          <Field label="Acima da meta a partir de">
            <NumberField value={t.highMargin} onChange={(v) => set((s) => void (s.targets.highMargin = v ?? 0))} suffix="%" />
          </Field>
        </div>
        {t.highMargin < t.minMargin && <p className="mt-2 text-xs text-warn">“Acima da meta” deve ser maior ou igual à margem mínima.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><StatusBadge status="loss" /> lucro negativo</span>
          <span className="flex items-center gap-2"><StatusBadge status="below" /> até {formatPercent(t.minMargin)}</span>
          <span className="flex items-center gap-2"><StatusBadge status="within" /> {formatPercent(t.minMargin)} a {formatPercent(t.highMargin)}</span>
          <span className="flex items-center gap-2"><StatusBadge status="above" /> a partir de {formatPercent(t.highMargin)}</span>
        </div>
      </Section>

      <Section
        icon={PercentIcon}
        title="Imposto (padrão para novas análises)"
        description="Tributos dependem do regime tributário e da operação da empresa. Configure de acordo com sua situação."
        action={<Switch aria-label="Ativar imposto nas novas análises" checked={settings.tax.enabled} onCheckedChange={(v) => set((s) => void (s.tax.enabled = v))} />}
      >
        <Field label="Alíquota sobre o preço de venda" className="sm:max-w-xs">
          <NumberField value={settings.tax.percent} onChange={(v) => set((s) => void (s.tax.percent = v ?? 0))} suffix="%" disabled={!settings.tax.enabled} />
        </Field>
        <p className="mt-2 text-[11px] text-muted-foreground">Desativado por padrão. Nenhum regime tributário é presumido.</p>
      </Section>

      <Section
        icon={MegaphoneIcon}
        title="Publicidade (padrão para novas análises)"
        description="Custo de anúncios por venda, descontado do lucro líquido."
        action={<Switch aria-label="Ativar publicidade nas novas análises" checked={settings.ads.enabled} onCheckedChange={(v) => set((s) => void (s.ads.enabled = v))} />}
      >
        <div className="flex flex-col gap-3 sm:max-w-md sm:flex-row">
          <Segmented
            size="sm"
            value={settings.ads.mode}
            onChange={(v) => set((s) => void (s.ads.mode = v))}
            options={[
              { value: "fixed", label: "CPA (R$/venda)" },
              { value: "percent", label: "% da venda" },
            ]}
          />
          <NumberField
            value={settings.ads.value}
            onChange={(v) => set((s) => void (s.ads.value = v ?? 0))}
            prefix={settings.ads.mode === "fixed" ? "R$" : undefined}
            suffix={settings.ads.mode === "percent" ? "%" : undefined}
            disabled={!settings.ads.enabled}
          />
        </div>
      </Section>

      <Section icon={DownloadIcon} title="Dados" description="Tudo fica salvo apenas neste navegador (LocalStorage). Faça backup para levar a outro dispositivo.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData}>
            <DownloadIcon data-icon="inline-start" /> Exportar backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <UploadIcon data-icon="inline-start" /> Importar backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ""
            }}
          />
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            <RotateCcwIcon data-icon="inline-start" /> Resetar todas as configurações
          </Button>
        </div>
      </Section>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar todas as configurações?</AlertDialogTitle>
            <AlertDialogDescription>Taxas dos três marketplaces, metas, imposto e publicidade voltam ao padrão. Produtos salvos não são apagados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                resetSettings()
                setResetOpen(false)
                toast.success("Configurações restauradas.")
              }}
            >
              Resetar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
