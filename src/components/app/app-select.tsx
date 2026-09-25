"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface Option<T extends string> {
  value: T
  label: string
}

/** Select do shadcn/ui com mapeamento valor → rótulo já resolvido. */
export function AppSelect<T extends string>({ value, onChange, options, placeholder, className, id, size }: { value: T | undefined; onChange: (v: T) => void; options: Option<T>[]; placeholder?: string; className?: string; id?: string; size?: "sm" | "default" }) {
  return (
    <Select items={options} value={value ?? null} onValueChange={(v) => v !== null && onChange(v as T)}>
      <SelectTrigger id={id} size={size} className={cn("w-full bg-input/20 data-[size=default]:h-9", className)}>
        <SelectValue placeholder={placeholder ?? "Selecione"} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
