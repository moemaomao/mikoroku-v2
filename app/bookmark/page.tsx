import type { Metadata } from "next";
import BookmarkClient from "./bookmark-client";
import "./bookmark.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Bookmark - Mikoroku",
  description: "Daftar manga yang disimpan di bookmark Mikoroku.",
  alternates: {
    canonical: "https://mikoroku.com/bookmark",
  },
};

export default function BookmarkRoute() {
  return <BookmarkClient />;
}
