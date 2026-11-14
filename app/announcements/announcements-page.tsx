"use client";

import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { MarkdownContent } from "../lib/markdown-content";

const firebaseConfig = {
  apiKey: "AIzaSyAi8z8oGGNJSNe87UVWh3FagJZSy_uhuoI",
  authDomain: "mikoroku.firebaseapp.com",
  databaseURL: "https://mikoroku-default-rtdb.firebaseio.com",
  projectId: "mikoroku",
  storageBucket: "mikoroku.firebasestorage.app",
  messagingSenderId: "271920446600",
  appId: "1:271920446600:web:974b11c707ebc11a7bf33d",
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
};


function timestamp(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null) {
    if ("toMillis" in value && typeof value.toMillis === "function") return value.toMillis();
    if ("seconds" in value && typeof value.seconds === "number") return value.seconds * 1000;
  }
  return 0;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const existingApp = getApps().find((app) => app.options.projectId === firebaseConfig.projectId);
      const app = existingApp ?? initializeApp(firebaseConfig, "mikoroku-announcements-public");
      const snapshot = await getDocs(
        query(collection(getFirestore(app), "announcements"), where("published", "==", true)),
      );
      const published = snapshot.docs
        .map((item) => {
          const data = item.data();
          return {
            id: item.id,
            title: typeof data.title === "string" ? data.title : "",
            content: typeof data.content === "string" ? data.content : "",
            createdAt: timestamp(data.publishedAt) || timestamp(data.createdAt),
            published: data.published === true,
          };
        })
        .filter((item) => item.published && item.title && item.content)
        .sort((left, right) => right.createdAt - left.createdAt);

      setAnnouncements(published);
      try {
        const stored = JSON.parse(window.localStorage.getItem("announcementsReadIds") || "[]");
        const readIds = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
        window.localStorage.setItem(
          "announcementsReadIds",
          JSON.stringify([...new Set([...readIds, ...published.map((item) => item.id)])]),
        );
      } catch (storageError) {
        console.error("Could not save announcement read status.", storageError);
      }
    } catch (loadError) {
      console.error("Failed to load announcements.", loadError);
      setError("Announcements could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  return (
    <main className="mx-auto my-10 mb-20 min-h-[calc(100vh-220px)] w-[min(900px,calc(100%-32px))] text-[#252733] max-[560px]:mt-6 dark:text-[#f4f4f6]">
      <header className="mb-7 border-b border-[rgb(35_40_55/14%)] pb-5 dark:border-[rgb(255_255_255/12%)]">
        <p className="mb-2 text-xs font-bold tracking-[0.16em] text-[#b43c42] dark:text-[#e17b7b]">MIKOROKU</p>
        <h1 className="m-0 text-[clamp(28px,5vw,40px)]">Announcements</h1>
        <p className="mt-2.5 mb-0 leading-[1.6] text-[#646b79] dark:text-[#aeb2bd]">
          Updates and important information from the Mikoroku team.
        </p>
      </header>

      {loading ? (
        <p className="rounded-xl border border-[rgb(35_40_55/13%)] bg-white p-5 text-center leading-[1.6] text-[#555b69] shadow-[0_5px_18px_rgb(25_31_46/7%)] dark:border-[rgb(255_255_255/12%)] dark:bg-[rgb(22_24_34/92%)] dark:text-[#d7d9df] dark:shadow-none">
          Loading announcements...
        </p>
      ) : error ? (
        <div className="rounded-xl border border-[rgb(35_40_55/13%)] bg-white p-5 text-center leading-[1.6] text-[#555b69] shadow-[0_5px_18px_rgb(25_31_46/7%)] dark:border-[rgb(255_255_255/12%)] dark:bg-[rgb(22_24_34/92%)] dark:text-[#d7d9df] dark:shadow-none">
          <p>{error}</p>
          <button
            className="mt-3.5 cursor-pointer rounded-[7px] border-0 bg-[#9e1b24] px-3.5 py-[9px] text-white"
            type="button"
            onClick={() => void loadAnnouncements()}
          >
            Try again
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <p className="rounded-xl border border-[rgb(35_40_55/13%)] bg-white p-5 text-center leading-[1.6] text-[#555b69] shadow-[0_5px_18px_rgb(25_31_46/7%)] dark:border-[rgb(255_255_255/12%)] dark:bg-[rgb(22_24_34/92%)] dark:text-[#d7d9df] dark:shadow-none">
          There are no announcements right now.
        </p>
      ) : (
        <section className="grid gap-4" aria-label="Published announcements">
          {announcements.map((announcement) => (
            <article
              className="rounded-xl border border-[rgb(35_40_55/13%)] bg-white p-5 shadow-[0_5px_18px_rgb(25_31_46/7%)] max-[560px]:p-4 dark:border-[rgb(255_255_255/12%)] dark:bg-[rgb(22_24_34/92%)] dark:shadow-none"
              key={announcement.id}
            >
              <div className="flex items-baseline justify-between gap-4 max-[560px]:items-start max-[560px]:flex-col max-[560px]:gap-[7px]">
                <h2 className="m-0 text-xl">{announcement.title}</h2>
                {announcement.createdAt > 0 && (
                  <time className="shrink-0 text-xs text-[#737987] dark:text-[#aeb2bd]" dateTime={new Date(announcement.createdAt).toISOString()}>
                    {new Date(announcement.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                )}
              </div>
              <MarkdownContent value={announcement.content} />
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
