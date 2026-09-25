"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BoxesIcon, CalculatorIcon, ColumnsIcon, LayoutDashboardIcon, MenuIcon, PackageIcon, SettingsIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"
import { MARKETPLACE_IDS } from "@/types"
import { useStore } from "@/components/providers/store-provider"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/analise", label: "Nova Análise", icon: CalculatorIcon },
  { href: "/produtos", label: "Produtos", icon: PackageIcon },
  { href: "/comparar", label: "Comparar Marketplaces", icon: ColumnsIcon },
  { href: "/lote", label: "Analisar Lote", icon: BoxesIcon },
  { href: "/configuracoes", label: "Configurações", icon: SettingsIcon },
]

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 17l5-5 4 4 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block text-sm font-semibold tracking-tight">Precifica Meli</span>
        <span className="block text-[10px] tracking-wide text-muted-foreground uppercase">Central de decisão</span>
      </span>
    </Link>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              active && "bg-sidebar-accent font-medium text-sidebar-foreground",
            )}
          >
            <Icon className={cn("size-4 text-sidebar-foreground/50 transition-colors group-hover:text-sidebar-foreground/80", active && "text-sidebar-foreground")} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function FeesFooter() {
  const { settings, hydrated } = useStore()
  if (!hydrated) return null
  const unconfirmed = MARKETPLACE_IDS.filter((id) => !settings.marketplaces[id].lastUpdatedAt)
  return (
    <Link href="/configuracoes" className="block rounded-lg border border-sidebar-border p-3 text-xs transition-colors hover:bg-sidebar-accent">
      <p className="font-medium text-sidebar-foreground">Taxas</p>
      {unconfirmed.length ? (
        <p className="mt-1 leading-relaxed text-muted-foreground">
          <span className="text-warn">{unconfirmed.length} de 3</span> marketplaces com taxas ainda não confirmadas por você.
        </p>
      ) : (
        <p className="mt-1 leading-relaxed text-muted-foreground">
          Confirmadas. Mais antiga:{" "}
          {formatDate(MARKETPLACE_IDS.map((id) => settings.marketplaces[id].lastUpdatedAt!).sort()[0])}
        </p>
      )}
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="flex min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex">
        <Brand />
        <div className="mt-8 flex-1">
          <NavLinks />
        </div>
        <FeesFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:hidden">
          <Brand />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menu" />}>
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar px-3 py-5">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Brand />
              <div className="mt-8 flex-1">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
              <FeesFooter />
            </SheetContent>
          </Sheet>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
