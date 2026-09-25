import type { FeeRule, MarketplaceConfig, MarketplaceId } from "@/types"

/**
 * PONTO DE EXTENSÃO PARA ATUALIZAÇÃO DE TAXAS
 *
 * Hoje a única fonte de taxas é a configuração manual do usuário
 * (`ManualFeeProvider`), salva no navegador. A calculadora nunca depende de
 * rede para funcionar.
 *
 * Para integrar uma API oficial no futuro, implemente `FeeProvider` e
 * retorne uma proposta de atualização. A proposta deve ser REVISADA e
 * aceita pelo usuário antes de substituir a configuração — só então
 * `lastUpdatedAt` recebe a data e `lastUpdatedNote` a origem.
 *
 * Integrações oficiais conhecidas (exigem cadastro de app e autenticação
 * OAuth do vendedor, por isso não há chamadas implementadas aqui):
 *  - Mercado Livre: API pública de desenvolvedores (developers.mercadolivre.com.br),
 *    recurso de preços de listagem por categoria/tipo de anúncio.
 *  - Shopee Open Platform (open.shopee.com).
 *  - TikTok Shop Partner Center (partner.tiktokshop.com).
 * Consulte a documentação oficial de cada uma antes de implementar.
 */

export interface FeeUpdateProposal {
  marketplace: MarketplaceId
  /** Regras sugeridas (substituem as regras com o mesmo id) */
  fees?: FeeRule[]
  categoryCommission?: MarketplaceConfig["categoryCommission"]
  /** De onde veio a informação (nome da API / documento) */
  origin: string
  fetchedAt: string
}

export interface FeeProvider {
  id: string
  label: string
  marketplace: MarketplaceId
  /** true somente quando a integração estiver implementada e autenticada */
  isAvailable(): boolean
  fetchProposal(): Promise<FeeUpdateProposal>
}

/** Fonte padrão: o que o usuário configurou. Não faz chamadas externas. */
export const ManualFeeProvider = {
  id: "manual",
  label: "Configuração manual",
} as const

/** Registro de provedores automáticos. Vazio de propósito: nenhuma integração foi implementada. */
export const feeProviders: FeeProvider[] = []

export function applyProposal(config: MarketplaceConfig, proposal: FeeUpdateProposal): MarketplaceConfig {
  const byId = new Map(config.fees.map((f) => [f.id, f]))
  for (const f of proposal.fees ?? []) byId.set(f.id, f)
  return {
    ...config,
    fees: [...byId.values()],
    categoryCommission: proposal.categoryCommission ?? config.categoryCommission,
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedNote: `Atualizado a partir de ${proposal.origin} (dados obtidos em ${proposal.fetchedAt}) e confirmado pelo usuário.`,
  }
}
