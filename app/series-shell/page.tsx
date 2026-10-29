import type { Metadata } from "next";
import SeriesShellClient from "./series-shell-client";

export const metadata: Metadata = {
  title: "Mikoroku",
  description: "Read manga on Mikoroku.",
};

export default function SeriesShellPage() {
  return <SeriesShellClient />;
}
