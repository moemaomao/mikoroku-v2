"use client";

import { useEffect, useState } from "react";
import DetailPageClient from "../series/detail-page-client";

export default function SeriesShellClient() {
  const [slug, setSlug] = useState("");

  useEffect(() => {
    const slugFromRedirect = new URLSearchParams(window.location.search).get("slug");
    if (!slugFromRedirect) return;

    const seriesPath = `/series/${encodeURIComponent(slugFromRedirect)}`;
    window.history.replaceState(null, "", seriesPath);
    setSlug(slugFromRedirect);
  }, []);

  if (!slug) {
    return (
      <main className="grid min-h-screen place-items-center" role="status" aria-label="Loading series">
        <span className="size-10 animate-spin rounded-full border-[3px] border-[var(--mikoroku-accent)]/25 border-t-[var(--mikoroku-accent)]" />
      </main>
    );
  }

  return <DetailPageClient slug={slug} />;
}
