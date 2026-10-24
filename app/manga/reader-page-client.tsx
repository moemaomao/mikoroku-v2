"use client";

import dynamic from "next/dynamic";

const ReaderPage = dynamic(() => import("./reader-page"), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-dvh bg-[#f1f2f4] dark:bg-[#111216]"
      aria-hidden="true"
    />
  ),
});

export default function ReaderPageClient({
  slug,
  chapter,
  kind,
}: {
  slug: string;
  chapter: string;
  kind: "manga" | "novel";
}) {
  return <ReaderPage slug={slug} chapter={chapter} kind={kind} />;
}