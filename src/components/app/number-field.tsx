"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { parseBRNumber } from "@/lib/format"

interface NumberFieldProps {
  id?: string
  value: number | null
  onChange: (value: number | null) => void
  prefix?: string
  suffix?: string
  /** Casas decimais exibidas fora de foco */
  decimals?: number
  placeholder?: string
  min?: number
  className?: string
  disabled?: boolean
  "aria-label"?: string
}

function display(value: number | null, decimals: number): string {
  // Zero aparece vazio (placeholder "0,00"): o que for digitado nunca é anexado a um "0,00" existente.
  if (value === null || !Number.isFinite(value) || value === 0) return ""
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals === 0 ? 0 : Math.min(decimals, 2), maximumFractionDigits: decimals })
}

/**
 * Campo numérico no padrão brasileiro: aceita "59,90", "1.234,56" ou "59.9".
 * Mantém o texto digitado enquanto em foco e formata ao sair.
 */
export function NumberField({ id, value, onChange, prefix, suffix, decimals = 2, placeholder, min = 0, className, disabled, ...rest }: NumberFieldProps) {
  const [focused, setFocused] = React.useState(false)
  const [text, setText] = React.useState(() => display(value, decimals))

  React.useEffect(() => {
    // Sincroniza com mudanças externas (ex.: duplicar produto, reset) quando o campo não está em edição.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!focused) setText(display(value, decimals))
  }, [value, decimals, focused])

  return (
    <div
      className={cn(
        "group/nf flex h-9 w-full items-center rounded-lg border border-input bg-input/20 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 hover:bg-input/30",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {prefix && <span className="pl-3 text-xs text-muted-foreground select-none">{prefix}</span>}
      <input
        id={id}
        aria-label={rest["aria-label"]}
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        className="num h-full w-full min-w-0 bg-transparent px-2.5 outline-none placeholder:text-muted-foreground/60"
        placeholder={placeholder ?? (decimals === 0 ? "0" : "0,00")}
        value={text}
        onFocus={(e) => {
          setFocused(true)
          const el = e.target
          el.select()
          requestAnimationFrame(() => {
            // Reaplica após o mouseup do clique, mas só se nada foi digitado ainda.
            if (document.activeElement === el && el.value === display(value, decimals)) el.select()
          })
        }}
        onBlur={() => {
          setFocused(false)
          setText(display(value, decimals))
        }}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,-]/g, "")
          setText(t)
          const n = parseBRNumber(t)
          if (n === null) return onChange(null)
          const factor = 10 ** decimals
          onChange(Math.max(min, Math.round(n * factor) / factor))
        }}
      />
      {suffix && <span className="pr-3 text-xs text-muted-foreground select-none">{suffix}</span>}
    </div>
  )
}
