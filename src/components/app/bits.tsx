"use client"

import * as React from "react"
import { InfoIcon } from "lucide-react"
import type { MarketplaceId, ProductStatus } from "@/types"
import { MARKETPLACE_META } from "@/config/marketplaces"
import { STATUS_SHORT } from "@/lib/calc/status"
import { formatBRL, formatPercent } from "@/lib/format"
import type { Cents } from "@/lib/money"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        {eyebrow && <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[1.7rem]">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-muted-foreground/80">{hint}</p>}
    </div>
  )
}

export function Section({ title, description, icon: Icon, children, className, action }: { title: string; description?: string; icon?: React.ElementType; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("rounded-xl border bg-card p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {Icon && <Icon className="mt-0.5 size-4 text-muted-foreground" />}
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function MarketplaceName({ id, name, className }: { id: MarketplaceId; name?: string; className?: string }) {
  const meta = MARKETPLACE_META[id]
  const label = name ?? { mercadolivre: "Mercado Livre", shopee: "Shopee", tiktok: "TikTok Shop" }[id]
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} aria-hidden />
      {label}
    </span>
  )
}

const STATUS_STYLE: Record<ProductStatus, string> = {
  loss: "bg-loss/12 text-loss ring-loss/25",
  below: "bg-warn/12 text-warn ring-warn/25",
  within: "bg-info/12 text-info ring-info/25",
  above: "bg-profit/12 text-profit ring-profit/25",
}

export function StatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset", STATUS_STYLE[status], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_SHORT[status]}
    </span>
  )
}

export function profitTone(cents: Cents | null | undefined) {
  if (cents === null || cents === undefined) return "text-muted-foreground"
  if (cents > 0) return "text-profit"
  if (cents < 0) return "text-loss"
  return "text-foreground"
}

export function Money({ cents, tone = false, className }: { cents: Cents | null | undefined; tone?: boolean; className?: string }) {
  return <span className={cn("num", tone && profitTone(cents), className)}>{formatBRL(cents)}</span>
}

export function Pct({ value, tone = false, className }: { value: number | null | undefined; tone?: boolean; className?: string }) {
  const t = value === null || value === undefined ? "text-muted-foreground" : value > 0 ? "text-profit" : value < 0 ? "text-loss" : ""
  return <span className={cn("num", tone && t, className)}>{formatPercent(value)}</span>
}

export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<button type="button" className="inline-flex text-muted-foreground/70 transition-colors hover:text-foreground" aria-label="Ajuda" />}>
        <InfoIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-xs leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center">
      <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4.5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, className, size = "default" }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string; size?: "sm" | "default" }) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-lg bg-muted p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-md px-3 font-medium whitespace-nowrap text-muted-foreground transition-all hover:text-foreground",
            size === "sm" ? "h-7 text-xs" : "h-8 text-xs sm:text-sm",
            value === o.value && "bg-background text-foreground shadow-sm ring-1 ring-foreground/10",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
