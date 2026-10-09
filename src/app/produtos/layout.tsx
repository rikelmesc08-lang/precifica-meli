import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Produtos salvos",
  description: "Lista das análises de produtos salvas neste navegador, com lucro, margem, ROI e status por meta.",
  alternates: { canonical: "/produtos/" },
  // Página depende de dados locais do navegador: sem conteúdo útil para buscadores.
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
