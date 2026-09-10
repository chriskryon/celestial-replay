import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_ORIGIN ?? "https://celestial-replay.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/callback"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
