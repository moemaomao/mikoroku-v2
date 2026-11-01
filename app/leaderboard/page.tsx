import type { Metadata } from "next";
import LeaderboardPage from "./leaderboard-page";

export const metadata: Metadata = {
  title: "Comment Leaderboard - Mikoroku",
  description: "See the most active Mikoroku commenters.",
  robots: { index: false, follow: false },
};

export default function LeaderboardRoute() {
  return <LeaderboardPage />;
}
