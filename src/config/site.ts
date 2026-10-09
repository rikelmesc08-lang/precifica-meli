/**
 * Dados do site para SEO (metadados, sitemap e robots).
 * URL canônica = deploy principal na Vercel (README). Pode ser trocada no build
 * com NEXT_PUBLIC_SITE_URL (sem barra no final).
 */
export const SITE_NAME = "Precifica Meli"

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://precifica-meli.vercel.app").replace(/\/+$/, "")

export const SITE_DESCRIPTION =
  "Calculadora gratuita de lucro, margem, ROI e preço ideal para vender no Mercado Livre, Shopee e TikTok Shop. Considera comissões, tarifas fixas, frete, imposto e publicidade. Roda no navegador, sem cadastro."

/** Rotas indexáveis (com barra final, pois o export usa trailingSlash). /produtos e /configuracoes ficam fora (noindex). */
export const SITE_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/analise/", priority: 0.9 },
  { path: "/comparar/", priority: 0.8 },
  { path: "/lote/", priority: 0.7 },
]
