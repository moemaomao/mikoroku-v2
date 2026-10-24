"use client";

import dynamic from "next/dynamic";

const ReaderPage = dynamic(() => import("./reader-page"), {
  ssr: false,
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