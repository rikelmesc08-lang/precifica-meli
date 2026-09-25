"use client"

import type { SaleResult } from "@/lib/calc"
import { formatBRL, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AdsSettings, TaxSettings } from "@/types"

const GROUP_LABEL = { commission: "Comissão", fixed: "Tarifa fixa", logistics: "Logística", other: "Outras taxas" } as const

function Row({ label, detail, value, kind = "minus", strong, muted }: { label: string; detail?: string; value: number; kind?: "plus" | "minus" | "result"; strong?: boolean; muted?: boolean }) {
  const text = kind === "minus" ? (value === 0 ? formatBRL(0) : "-" + formatBRL(value)) : formatBRL(value)
  return (
    <div className={cn("flex items-baseline gap-2 py-1.5 text-[13px]", muted && "text-muted-foreground")}>
      <span className={cn("shrink-0", strong && "font-semibold")}>{label}</span>
      {detail && <span className="truncate text-[11px] text-muted-foreground">{detail}</span>}
      <span className="mx-1 min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-foreground/15" aria-hidden />
      <span className={cn("num shrink-0", kind === "minus" && value > 0 && "text-foreground/85", strong && "font-semibold", kind === "result" && (value >= 0 ? "text-profit" : "text-loss"))}>{text}</span>
    </div>
  )
}

/**
 * Detalhamento auditável: cada valor que compõe o lucro, na ordem em que é
 * descontado, com a regra e o percentual aplicados.
 */
export function SaleBreakdown({ sale, tax, ads }: { sale: SaleResult; tax: TaxSettings; ads: AdsSettings }) {
  const u = sale.unitCost
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-background/40 px-4 py-2">
        <Row label="Preço de venda" value={sale.price} kind="plus" strong />
        {sale.feeLines.length === 0 && <Row label="Taxas da plataforma" detail="nenhuma regra aplicável" value={0} muted />}
        {sale.feeLines.map((l) => (
          <Row
            key={l.ruleId}
            label={GROUP_LABEL[l.group]}
            detail={`${l.label}${l.kind === "percent" ? ` · ${formatPercent(l.rate)} de ${formatBRL(sale.price)}${l.capped ? " (teto aplicado)" : ""}` : ""}`}
            value={l.amount}
          />
        ))}
        <div className="my-1 border-t" />
        <Row label="Valor líquido recebido" detail="preço − taxas da plataforma" value={sale.netReceived} kind="plus" strong />
        <div className="my-1 border-t" />
        <Row label="Impostos" detail={tax.enabled ? `${formatPercent(tax.percent)} de ${formatBRL(sale.price)}` : "desativado"} value={sale.tax} muted={!tax.enabled} />
        <Row
          label="Publicidade"
          detail={ads.enabled ? (ads.mode === "percent" ? `${formatPercent(ads.value)} de ${formatBRL(sale.price)}` : "CPA por venda") : "desativado"}
          value={sale.ads}
          muted={!ads.enabled}
        />
        <Row label="Custo do produto" value={u.product} />
        <Row label="Frete fornecedor" detail="rateado por unidade" value={u.freight} />
        <Row label="Embalagem" value={u.packaging} />
        <Row label="Outros custos" value={u.other} />
        <div className="my-1 border-t border-foreground/20" />
        <Row label="Lucro líquido" value={sale.profit} kind="result" strong />
      </div>

      <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
          <dt className="font-medium text-foreground">Margem líquida {formatPercent(sale.margin)}</dt>
          <dd className="num mt-0.5">
            {formatBRL(sale.profit)} ÷ {formatBRL(sale.price)} × 100
          </dd>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
          <dt className="font-medium text-foreground">ROI {formatPercent(sale.roi)}</dt>
          <dd className="num mt-0.5">
            {formatBRL(sale.profit)} ÷ {formatBRL(u.total)} (custo real) × 100
          </dd>
        </div>
      </dl>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Cada tarifa percentual é arredondada ao centavo (meio para cima) antes de somar. Custo real = produto + frete rateado + embalagem + outros ={" "}
        <span className="num">{formatBRL(u.total)}</span>.
      </p>
    </div>
  )
}
