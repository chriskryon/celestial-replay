import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_ORIGIN ?? "https://celestial-replay.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/advanced", "/playlists", "/history"];
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
