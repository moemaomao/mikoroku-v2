import type { MetadataRoute } from "next";

const SITE_URL = "https://mikoroku.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/bookmark",
        "/global-settings",
        "/history",
        "/leaderboard",
        "/login",
        "/settings",
        "/stats",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
