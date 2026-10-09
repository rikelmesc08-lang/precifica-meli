import type { MetadataRoute } from "next"
import { SITE_ROUTES, SITE_URL } from "@/config/site"

export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  return SITE_ROUTES.map(({ path, priority }) => ({ url: `${SITE_URL}${path}`, changeFrequency: "monthly", priority }))
}
