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
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("kind");
    const slug = params.get("slug");
    const chapter = params.get("chapter");
    if (
      (kind !== "manga" && kind !== "novel") ||
      !slug ||
      !chapter
    ) {
      setInvalidRoute(true);
      return;
    }

    params.delete("kind");
    params.delete("slug");
    params.delete("chapter");
    const query = params.toString();
    const path = `/${kind}/${encodeURIComponent(slug)}/${encodeURIComponent(chapter)}`;
    window.history.replaceState(null, "", query ? `${path}?${query}` : path);
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
        <span className="size-10 animate-spin rounded-full border-[3px] border-[var(--mikoroku-accent)]/25 border-t-[var(--mikoroku-accent)]" />
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
