import type { Metadata } from "next";
import ModerationClient from "./moderation-client";

export const metadata: Metadata = {
  title: "Moderator Panel - Mikoroku",
  robots: { index: false, follow: false },
};

export default function ModeratorRoute() {
  return <ModerationClient />;
}
