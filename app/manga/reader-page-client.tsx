"use client";

import ReaderPage from "./reader-page";

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