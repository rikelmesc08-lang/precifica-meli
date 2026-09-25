import type { FeeRule, MarketplaceConfig, MarketplaceId } from "@/types"

/**
 * CONFIGURAÇÃO INICIAL DAS TAXAS
 *
 * Este é o ÚNICO lugar do código onde existem percentuais/tarifas de
 * marketplace. O motor de cálculo nunca usa números fixos: ele lê a
 * configuração salva pelo usuário (que parte destes valores).
 *
 * Os valores abaixo são uma REFERÊNCIA INICIAL levantada em fontes públicas
 * consultadas em 25/09/2026 (listadas em `sources`; páginas oficiais com
 * consultedAt null são links para conferência cujo conteúdo não foi lido). Eles NÃO são
 * verificados automaticamente e podem mudar a qualquer momento ou variar por
 * conta, reputação, categoria e programa. `lastUpdatedAt` começa como null
 * e só é preenchido quando o usuário confirma as taxas em Configurações.
 */

const CONSULTED_AT = "2026-09-25"

function rule(partial: Omit<FeeRule, "enabled" | "minPrice" | "maxPrice"> & Partial<FeeRule>): FeeRule {
  return { enabled: true, minPrice: null, maxPrice: null, cap: null, ...partial }
}

const mercadoLivre: MarketplaceConfig = {
  id: "mercadolivre",
  name: "Mercado Livre",
  categoryCommission: {
    enabled: true,
    listingTypes: [
      { id: "classico", label: "Clássico" },
      { id: "premium", label: "Premium" },
    ],
    defaultListingTypeId: "classico",
    defaultCategoryId: "casa-moveis-decoracao",
    categories: [
      { id: "acessorios-veiculos", name: "Acessórios para Veículos", rates: { classico: 12, premium: 17 } },
      { id: "agro", name: "Agro", rates: { classico: 11.5, premium: 16.5 } },
      { id: "alimentos-bebidas", name: "Alimentos e Bebidas", rates: { classico: 14, premium: 19 } },
      { id: "antiguidades", name: "Antiguidades e Coleções", rates: { classico: 11.5, premium: 16.5 } },
      { id: "arte-papelaria", name: "Arte, Papelaria e Armarinho", rates: { classico: 11.5, premium: 16.5 } },
      { id: "bebes", name: "Bebês", rates: { classico: 14, premium: 19 } },
      { id: "beleza", name: "Beleza e Cuidado Pessoal", rates: { classico: 14, premium: 19 } },
      { id: "brinquedos", name: "Brinquedos e Hobbies", rates: { classico: 11.5, premium: 16.5 } },
      { id: "moda", name: "Calçados, Roupas e Bolsas", rates: { classico: 14, premium: 19 } },
      { id: "cameras", name: "Câmeras e Acessórios", rates: { classico: 11, premium: 16 } },
      { id: "casa-moveis-decoracao", name: "Casa, Móveis e Decoração", rates: { classico: 11.5, premium: 16.5 } },
      { id: "eletrodomesticos", name: "Eletrodomésticos", rates: { classico: 11, premium: 16 } },
      { id: "eletronicos", name: "Eletrônicos, Áudio e Vídeo", rates: { classico: 13, premium: 18 } },
      { id: "esportes", name: "Esportes e Fitness", rates: { classico: 14, premium: 19 } },
      { id: "informatica", name: "Informática", rates: { classico: 11, premium: 16 } },
      { id: "joias-relogios", name: "Joias e Relógios", rates: { classico: 12.5, premium: 17.5 } },
      { id: "livros", name: "Livros, Revistas e Comics", rates: { classico: 12, premium: 17 } },
      { id: "pet-shop", name: "Pet Shop", rates: { classico: 12.5, premium: 17.5 } },
    ],
  },
  fees: [
    rule({
      id: "ml-fixed-a",
      label: "Custo por unidade vendida (metade do preço)",
      group: "fixed",
      kind: "percent",
      value: 50,
      minPrice: null,
      maxPrice: 12.5,
      note: "Produtos abaixo de R$ 12,50 pagam metade do preço como custo fixo.",
    }),
    rule({ id: "ml-fixed-b", label: "Custo por unidade vendida", group: "fixed", kind: "fixed", value: 6.25, minPrice: 12.5, maxPrice: 29 }),
    rule({ id: "ml-fixed-c", label: "Custo por unidade vendida", group: "fixed", kind: "fixed", value: 6.5, minPrice: 29, maxPrice: 50 }),
    rule({
      id: "ml-fixed-d",
      label: "Custo por unidade vendida",
      group: "fixed",
      kind: "fixed",
      value: 6.75,
      minPrice: 50,
      maxPrice: 79,
      note: "Fontes indicam que desde mar/2026 o custo abaixo de R$ 79 também varia por peso/dimensão. Confira o valor exibido na sua conta.",
    }),
    rule({
      id: "ml-shipping",
      label: "Frete grátis pago pelo vendedor",
      group: "logistics",
      kind: "fixed",
      value: 0,
      minPrice: 79,
      maxPrice: null,
      note: "A partir de R$ 79 o frete grátis é obrigatório. O custo depende de peso, dimensões e reputação — informe o valor da sua tabela.",
    }),
  ],
  sources: [
    { label: "Koncili — comissões por categoria e custo fixo", url: "https://www.koncili.com/blog/categorias-do-mercado-livre/", consultedAt: CONSULTED_AT },
    { label: "Lider 10 — taxas 2026 e degrau dos R$ 79", url: "https://lider10.com.br/blog/taxas-mercado-livre-2026.html", consultedAt: CONSULTED_AT },
  ],
  lastUpdatedAt: null,
  lastUpdatedNote: "",
}

const shopee: MarketplaceConfig = {
  id: "shopee",
  name: "Shopee",
  fees: [
    rule({ id: "sp-comm-a", label: "Comissão (até R$ 79,99)", group: "commission", kind: "percent", value: 20, maxPrice: 80 }),
    rule({ id: "sp-comm-b", label: "Comissão (a partir de R$ 80)", group: "commission", kind: "percent", value: 14, minPrice: 80 }),
    rule({ id: "sp-fixed-a", label: "Tarifa fixa por item", group: "fixed", kind: "fixed", value: 4, maxPrice: 80 }),
    rule({ id: "sp-fixed-b", label: "Tarifa fixa por item", group: "fixed", kind: "fixed", value: 16, minPrice: 80, maxPrice: 100 }),
    rule({ id: "sp-fixed-c", label: "Tarifa fixa por item", group: "fixed", kind: "fixed", value: 20, minPrice: 100, maxPrice: 200 }),
    rule({ id: "sp-fixed-d", label: "Tarifa fixa por item", group: "fixed", kind: "fixed", value: 26, minPrice: 200, maxPrice: 500 }),
    rule({ id: "sp-fixed-e", label: "Tarifa fixa por item", group: "fixed", kind: "fixed", value: 28, minPrice: 500 }),
    rule({
      id: "sp-service",
      label: "Taxa de serviço",
      group: "other",
      kind: "percent",
      value: 0,
      enabled: false,
      note: "Na política de mar/2026 a taxa de serviço está incorporada à comissão. Use se sua conta tiver cobrança separada.",
    }),
    rule({
      id: "sp-shipping",
      label: "Programa de frete",
      group: "logistics",
      kind: "percent",
      value: 0,
      enabled: false,
      note: "Informe se houver cobrança separada de programa de frete na sua conta.",
    }),
    rule({
      id: "sp-cpf",
      label: "Adicional vendedor CPF (+450 pedidos/90 dias)",
      group: "other",
      kind: "fixed",
      value: 3,
      enabled: false,
    }),
    rule({
      id: "sp-campaign",
      label: "Campanha de Destaque",
      group: "other",
      kind: "percent",
      value: 2.5,
      enabled: false,
      note: "Cobrado apenas durante a participação na campanha.",
    }),
  ],
  sources: [
    {
      label: "Shopee — Política de comissão CNPJ e CPF 2026 (página oficial, para conferência)",
      url: "https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026",
      consultedAt: null,
    },
    { label: "Irroba — tabela de comissões Shopee 2026", url: "https://blog.irroba.com.br/novas-taxas-shopee-2026-guia-de-comissoes-e-frete/", consultedAt: CONSULTED_AT },
  ],
  lastUpdatedAt: null,
  lastUpdatedNote: "",
}

const tiktok: MarketplaceConfig = {
  id: "tiktok",
  name: "TikTok Shop",
  fees: [
    rule({ id: "tt-comm-a", label: "Comissão (regra A: abaixo de R$ 50)", group: "commission", kind: "percent", value: 10, maxPrice: 50 }),
    rule({ id: "tt-comm-b", label: "Comissão (regra B: a partir de R$ 50)", group: "commission", kind: "percent", value: 6, minPrice: 50 }),
    rule({ id: "tt-fixed-a", label: "Tarifa fixa por item (regra A)", group: "fixed", kind: "fixed", value: 4, maxPrice: 50 }),
    rule({ id: "tt-fixed-b", label: "Tarifa fixa por item (regra B)", group: "fixed", kind: "fixed", value: 6, minPrice: 50 }),
    rule({
      id: "tt-shipping",
      label: "Programa de Frete Grátis",
      group: "logistics",
      kind: "percent",
      value: 6,
      enabled: false,
      note: "Somente para sellers participantes do programa.",
    }),
    rule({
      id: "tt-affiliate",
      label: "Comissão de afiliados",
      group: "other",
      kind: "percent",
      value: 0,
      enabled: false,
      note: "Opcional e definida por você no plano de afiliados.",
    }),
  ],
  sources: [
    {
      label: "Ge-commerce — novas taxas TikTok Shop a partir de 15/07/2026",
      url: "https://gecommerce.com.br/marketing-digital-ecommerce/novas-taxas-do-tiktok-shop-em-2026-o-que-muda-a-partir-de-15-de-julho-e-como-recalcular-sua-margem/",
      consultedAt: CONSULTED_AT,
    },
    {
      label: "TikTok Shop — Tarifa de Comissão da Plataforma (página oficial, para conferência)",
      url: "https://seller-br.tiktok.com/university/essay?knowledge_id=24428156307201&lang=pt-BR",
      consultedAt: null,
    },
  ],
  lastUpdatedAt: null,
  lastUpdatedNote: "",
}

export const DEFAULT_MARKETPLACES: Record<MarketplaceId, MarketplaceConfig> = {
  mercadolivre: mercadoLivre,
  shopee,
  tiktok,
}

export const MARKETPLACE_META: Record<MarketplaceId, { short: string; dot: string }> = {
  mercadolivre: { short: "ML", dot: "bg-[#ffe600]" },
  shopee: { short: "Shopee", dot: "bg-[#ee4d2d]" },
  tiktok: { short: "TikTok", dot: "bg-[#25f4ee]" },
}
