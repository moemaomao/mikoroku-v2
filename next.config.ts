import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev({ configPath: "wrangler.jsonc" });

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/widgets/comment-widget.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
      },
      {
        source: "/widgets/comment-widget.css",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
      },
      {
        source: "/widgets/comment-runtime.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
      },
      ...["dm", "report", "settings", "effects"].map((feature) => ({
        source: `/widgets/comment-${feature}.css`,
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
      })),
      {
        source: "/widgets/emoji-reaction.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/index.html",
        destination: "/",
        permanent: true,
      },
      {
        source: "/bookmark.html",
        destination: "/bookmark",
        permanent: true,
      },
      {
        source: "/read/:slug/:chapter",
        destination: "/novel/:slug/:chapter",
        permanent: true,
      },
      {
        source: "/reader/:slug/:chapter",
        destination: "/manga/:slug/:chapter",
        permanent: true,
      },
      {
        source: "/detail/:slug",
        destination: "/series/:slug",
        permanent: true,
      },
      { source: "/favicon-16x16.png", destination: "/assets/icons/favicon-16x16.png", permanent: true },
      { source: "/favicon-32x32.png", destination: "/assets/icons/favicon-32x32.png", permanent: true },
      { source: "/favicon.ico", destination: "/assets/icons/favicon.ico", permanent: true },
      { source: "/favicon.png", destination: "/assets/icons/favicon.png", permanent: true },
      { source: "/apple-touch-icon.png", destination: "/assets/icons/apple-touch-icon.png", permanent: true },
      { source: "/Features/Hakoroku/assets/:path*", destination: "/assets/hakoroku/:path*", permanent: true },
      { source: "/pages/mangalist.html", destination: "/manga-list", permanent: true },
      { source: "/pages/hentailist.html", destination: "/hentai-list", permanent: true },
      { source: "/pages/genrelist.html", destination: "/genre-list", permanent: true },
      { source: "/pages/about.html", destination: "/about", permanent: true },
      { source: "/pages/privacy.html", destination: "/privacy", permanent: true },
      { source: "/pages/terms.html", destination: "/terms", permanent: true },
      { source: "/pages/dmca.html", destination: "/dmca", permanent: true },
      { source: "/pages/commission.html", destination: "/commission", permanent: true },
      { source: "/Pages/about.html", destination: "/about", permanent: true },
      { source: "/Pages/privacy.html", destination: "/privacy", permanent: true },
      { source: "/Pages/terms.html", destination: "/terms", permanent: true },
      { source: "/Pages/dmca.html", destination: "/dmca", permanent: true },
      { source: "/user-settings.html", destination: "/settings", permanent: true },
    ];
  },
};

export default nextConfig;
