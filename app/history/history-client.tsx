"use client";

import dynamic from "next/dynamic";
import CenteredLoadingSpinner from "../centered-loading-spinner";

const ReadingHistoryPage = dynamic(() => import("./reading-history-page"), {
  ssr: false,
  loading: () => (
    <main className="reading-history-route route-page-background" aria-busy="true">
      <CenteredLoadingSpinner label="Loading reading history" />
    </main>
  ),
});

export default function HistoryClient() {
  return <ReadingHistoryPage />;
}
