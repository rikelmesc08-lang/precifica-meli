"use client"

import { MARKETPLACE_IDS } from "@/types"
import { useStore } from "@/components/providers/store-provider"
import { MarketplaceName, PageHeader } from "@/components/app/bits"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MarketplaceSettings } from "@/components/settings/marketplace-settings"
import { GeneralSettings } from "@/components/settings/general-settings"

export default function SettingsPage() {
  const { hydrated, settings } = useStore()
  if (!hydrated) return <div className="h-96 animate-pulse rounded-xl bg-muted/30" />

  return (
    <>
      <PageHeader
        eyebrow="Taxas e metas"
        title="Configurações"
        description="Todas as taxas usadas nos cálculos vêm daqui. Plataformas mudam suas tarifas com frequência — revise e confirme periodicamente."
      />
      <Tabs defaultValue="mercadolivre">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <TabsList className="h-9">
            {MARKETPLACE_IDS.map((id) => (
              <TabsTrigger key={id} value={id} className="px-3">
                <MarketplaceName id={id} name={settings.marketplaces[id].name} />
              </TabsTrigger>
            ))}
            <TabsTrigger value="geral" className="px-3">
              Geral
            </TabsTrigger>
          </TabsList>
        </div>
        {MARKETPLACE_IDS.map((id) => (
          <TabsContent key={id} value={id} className="mt-5">
            <MarketplaceSettings id={id} />
          </TabsContent>
        ))}
        <TabsContent value="geral" className="mt-5">
          <GeneralSettings />
        </TabsContent>
      </Tabs>
    </>
  )
}
