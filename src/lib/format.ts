import { toReais, type Cents } from "./money"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })

/** R$ 59,90 (espaço normal no lugar do NBSP para leitura consistente). */
export function formatBRL(cents: Cents | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "—"
  return brl.format(toReais(cents)).replace(/ /g, " ")
}

/** -R$ 7,19 para deduções (sinal explícito). */
export function formatSignedBRL(cents: Cents): string {
  if (cents < 0) return "-" + formatBRL(-cents)
  return formatBRL(cents)
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—"
  return num2.format(value) + "%"
}

export function formatNumber(value: number): string {
  return int.format(value)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** Converte texto digitado no padrão brasileiro ("1.234,56" ou "59,9") em número. */
export function parseBRNumber(text: string): number | null {
  const t = text.trim().replace(/\s|R\$|%/g, "")
  if (!t) return null
  let normalized = t
  if (t.includes(",")) normalized = t.replace(/\./g, "").replace(",", ".")
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}
