import type { Metadata } from "next";
import HistoryClient from "./history-client";

export const metadata: Metadata = {
  title: "Reading History - Mikoroku",
  description: "Continue reading the manga and novels you last read on Mikoroku.",
  alternates: { canonical: "https://mikoroku.top/history" },
};

export default function HistoryRoute() {
  return <HistoryClient />;
}
