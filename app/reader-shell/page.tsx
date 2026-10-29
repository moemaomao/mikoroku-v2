import type { Metadata } from "next";
import ReaderShellClient from "./reader-shell-client";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Reader | Mikoroku",
  description: "Read manga and novels on Mikoroku.",
};

export default function ReaderShellPage() {
  return <ReaderShellClient />;
}
