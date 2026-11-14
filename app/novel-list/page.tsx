import type { Metadata } from "next";
import CatalogClient from "../catalog/catalog-client";

export const metadata: Metadata = {
  title: "Novel List - Mikoroku",
  description: "Jelajahi katalog novel, light novel, dan web novel di Mikoroku.",
  alternates: { canonical: "https://mikoroku.com/novel-list" },
};

export default function NovelListRoute() {
  return <CatalogClient kind="novel" title="Novel List" />;
}
