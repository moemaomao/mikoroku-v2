"use client";

import dynamic from "next/dynamic";

const BookmarkPage = dynamic(() => import("./bookmark-page"), {
  ssr: false,
  loading: () => (
    <main className="bookmark-route" aria-busy="true">
      <section className="bookmark-container" aria-labelledby="bookmark-title">
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
