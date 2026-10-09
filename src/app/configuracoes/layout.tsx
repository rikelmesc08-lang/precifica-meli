import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Configurações de taxas e metas",
  description: "Revise comissões, tarifas fixas, faixas de preço, imposto, publicidade e metas de margem usadas nos cálculos.",
  alternates: { canonical: "/configuracoes/" },
  // Página depende de dados locais do navegador: sem conteúdo útil para buscadores.
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
