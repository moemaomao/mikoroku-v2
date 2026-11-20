"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { BannerAdSlot } from "../advertisement-manager";
import SiteHeader from "../site-header";
import SeriesLoadingContent from "./series-loading-content";
import type { SeriesChapterSummary, SeriesManga } from "../../lib/series-data";

const DetailPageContent = dynamic(() => import("./detail-page-content"), {
  loading: () => <SeriesLoadingContent />,
});

export function preloadDetailPageContent(): void {
  void import("./detail-page-content").catch((error: unknown) => {
    console.error("Could not preload series details.", error);
  });
}

type DetailPageClientProps = {
  slug: string;
  initialManga?: SeriesManga | null;
  initialChapters?: SeriesChapterSummary[];
  initialChapterSource?: "blogger" | "blogger2" | "firestore" | "cache";
};

export default function DetailPageClient({
  slug,
  initialManga = null,
  initialChapters = [],
  initialChapterSource = "cache",
}: DetailPageClientProps) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <SiteHeader />
      <BannerAdSlot placement="site-top" />
            <DetailPageContent
        key={slug}
        slug={slug}
        initialManga={(initialManga as any) ?? null}
        initialChapters={(initialChapters ?? []).map((c) => ({
          ...c,
          source: (c.source ?? "blogger") as "blogger" | "blogger2" | "firestore",
        })) as any}
        initialChapterSource={
          initialChapterSource === "cache"
            ? "blogger"
            : (initialChapterSource as "blogger" | "blogger2" | "firestore")
        }
      />
    </>
  );
}
