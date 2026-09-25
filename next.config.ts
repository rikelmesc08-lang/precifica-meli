import type { NextConfig } from "next"

// A aplicação é 100% client-side (LocalStorage), então é publicada como site estático.
// BASE_PATH é definido no build do GitHub Pages (ex.: "/precifica-meli"); localmente fica vazio.
const basePath = process.env.BASE_PATH || ""

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
