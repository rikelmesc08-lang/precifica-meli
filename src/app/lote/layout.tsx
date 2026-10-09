import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Análise de lote",
  description: "Calcule capital necessário, custo total, faturamento, lucro e ROI de um lote de compra para revender em marketplaces.",
  alternates: { canonical: "/lote/" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
