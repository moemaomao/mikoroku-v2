"use client";

import dynamic from "next/dynamic";

const BookmarkPage = dynamic(() => import("./bookmark-page"), {
  ssr: false,
  loading: () => (
    <main
      className="bookmark-route route-page-background"
      aria-busy="true"
      style={{ backgroundColor: "var(--mk-page-bg, #0b0b0b)", color: "var(--mk-bookmark-text, #fff)" }}
    >
      <section
        className="bookmark-container"
        aria-labelledby="bookmark-title"
        style={{ backgroundColor: "var(--mk-bookmark-container, #0f0f1e)" }}
      >
        <header className="bookmark-header">
          <h1 id="bookmark-title">Bookmark</h1>
        </header>
        <p role="status">Memuat bookmark...</p>
      </section>
    </main>
  ),
});

export default function BookmarkClient() {
  return <BookmarkPage />;
}
