"use client";

import dynamic from "next/dynamic";
import CenteredLoadingSpinner from "../centered-loading-spinner";

const BookmarkPage = dynamic(() => import("./bookmark-page"), {
  ssr: false,
  loading: () => (
    <main
      className="bookmark-route route-page-background"
      aria-busy="true"
      style={{ backgroundColor: "var(--mk-page-bg, #0b0b0b)", color: "var(--mk-bookmark-text, #fff)" }}
    >
      <CenteredLoadingSpinner label="Loading bookmarks" />
    </main>
  ),
});

export default function BookmarkClient() {
  return <BookmarkPage />;
}
