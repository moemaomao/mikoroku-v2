"use client";

import { useEffect, useState } from "react";
import ReaderPageClient from "../manga/reader-page-client";

type ReaderRoute = {
  kind: "manga" | "novel";
  slug: string;
  chapter: string;
};

export default function ReaderShellClient() {
  const [reader, setReader] = useState<ReaderRoute | null>(null);
  const [invalidRoute, setInvalidRoute] = useState(false);

  useEffect(() => {
    const pathMatch = window.location.pathname.match(
      /^\/(manga|novel)\/([^/]+)\/([^/]+)\/?$/,
    );
    const params = new URLSearchParams(window.location.search);
    const kind = pathMatch?.[1] || params.get("kind");
    const encodedSlug = pathMatch?.[2];
    const encodedChapter = pathMatch?.[3];
    let slug = encodedSlug || params.get("slug");
    let chapter = encodedChapter || params.get("chapter") || params.get("c");
    if (
      (kind !== "manga" && kind !== "novel") ||
      !slug ||
      !chapter
    ) {
      setInvalidRoute(true);
      return;
    }

    try {
      if (encodedSlug) slug = decodeURIComponent(encodedSlug);
      if (encodedChapter) chapter = decodeURIComponent(encodedChapter);
    } catch {
      setInvalidRoute(true);
      return;
    }

    if (!pathMatch) {
      params.delete("kind");
      params.delete("slug");
      params.delete("chapter");
      params.delete("c");
      const query = params.toString();
      const path = `/${kind}/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`;
      window.history.replaceState(null, "", query ? `${path}?${query}` : path);
    }
    setReader({ kind, slug, chapter });
  }, []);

  if (invalidRoute) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Reader page could not be opened</h1>
          <p className="mt-2 text-sm text-white/70">Open a chapter from its manga or novel page.</p>
          <a className="mt-4 inline-block underline" href="/">Go to homepage</a>
        </div>
      </main>
    );
  }

  if (!reader) {
    return (
      <main className="grid min-h-screen place-items-center" role="status" aria-label="Loading reader">
        <div className="flex flex-col items-center gap-3">
          <span
            className="size-10 animate-spin rounded-full border-[3px] border-[var(--mikoroku-accent)]/25 border-t-[var(--mikoroku-accent)]"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading series...</span>
        </div>
      </main>
    );
  }

  return (
    <ReaderPageClient
      slug={reader.slug}
      chapter={reader.chapter}
      kind={reader.kind}
    />
  );
}
