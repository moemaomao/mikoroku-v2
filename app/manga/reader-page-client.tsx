"use client";

import dynamic from "next/dynamic";

const ReaderPage = dynamic(() => import("./reader-page"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
        color: "#94a3b8",
      }}
    >
      Loading chapter…
    </div>
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