import type { Metadata } from "next";
import BookmarkPage from "./bookmark-page";
import "./bookmark.css";

export const metadata: Metadata = {
  title: "Bookmark - Mikoroku",
  description: "Daftar manga yang disimpan di bookmark Mikoroku.",
  alternates: {
    canonical: "https://mikoroku.com/bookmark",
  },
};

export default function BookmarkRoute() {
  return <BookmarkPage />;
}
