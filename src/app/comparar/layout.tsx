import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Comparar Mercado Livre, Shopee e TikTok Shop",
  description: "Compare lado a lado taxas, valor líquido recebido, lucro e margem de um mesmo produto no Mercado Livre, na Shopee e no TikTok Shop.",
  alternates: { canonical: "/comparar/" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
