"use client";

import { useEffect, useState } from "react";
import DetailPageClient from "../series/detail-page-client";

export default function SeriesShellClient() {
  const [slug, setSlug] = useState("");
  const [invalidRoute, setInvalidRoute] = useState(false);

  useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/series\/([^/]+)\/?$/);
    const encodedSlug = pathMatch?.[1];
    const slugFromQuery = new URLSearchParams(window.location.search).get("slug");
    const slugValue = encodedSlug || slugFromQuery;
    if (!slugValue) {
      setInvalidRoute(true);
      return;
    }

    try {
      setSlug(encodedSlug ? decodeURIComponent(slugValue) : slugValue);
    } catch {
      setInvalidRoute(true);
    }
  }, []);

  if (invalidRoute) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Series page could not be opened</h1>
          <a className="mt-4 inline-block underline" href="/">Go to homepage</a>
        </div>
      </main>
    );
  }

  if (!slug) {
    return (
      <main className="grid min-h-screen place-items-center" role="status" aria-label="Loading series">
        <span className="size-10 animate-spin rounded-full border-[3px] border-[var(--mikoroku-accent)]/25 border-t-[var(--mikoroku-accent)]" />
      </main>
    );
  }

  return <DetailPageClient slug={slug} />;
}
