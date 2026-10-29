"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { imageProxyUrl } from "../../lib/image-proxy";
import {
  clearReadingHistory,
  deleteReadingHistoryEntry,
  readReadingHistory,
  type ReadingHistoryEntry,
} from "../../lib/reading-history";
import GlobalAuth from "../global-auth";
import { CoverImage } from "../lib/cover-image";
import MangaDataProvider from "../manga-data-provider";
import SiteFooter from "../site-footer";
import SiteHeader from "../site-header";
import UserModals from "../user-modals";
import "./history.css";

const FALLBACK_COVER = "/assets/icons/favicon.ico";

function coverUrl(value: string): string {
  if (!value) return FALLBACK_COVER;
  return /^https?:\/\//i.test(value)
    ? imageProxyUrl(value, "historyCover")
    : imageProxyUrl(
        `https://raw.githubusercontent.com/moemaomao/mymangadata/main/${value.replace(/^\//, "")}`,
        "historyCover",
      );
}

function formatElapsed(time: number): string {
  const elapsed = Math.max(0, Date.now() - time);
  if (elapsed < 60_000) return "Just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} min ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} hr ago`;
  return `${Math.floor(elapsed / 86_400_000)} days ago`;
}

export default function ReadingHistoryPage() {
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => {
    void readReadingHistory().then(setHistory).catch((loadError: unknown) => {
      console.error("Could not load reading history.", loadError);
      setError("Reading history could not be loaded from browser storage.");
    });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("mikoroku:reading-history-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("mikoroku:reading-history-updated", refresh);
    };
  }, [refresh]);

  async function deleteEntry(url: string) {
    setBusy(true);
    setError("");
    try {
      await deleteReadingHistoryEntry(url);
      setHistory(await readReadingHistory());
      window.dispatchEvent(new Event("mikoroku:reading-history-updated"));
    } catch (error) {
      console.error("Could not remove reading history entry.", error);
      setError("Could not delete the reading history entry from browser storage.");
    } finally {
      setBusy(false);
    }
  }

  async function clearHistory() {
    if (!window.confirm("Clear all reading history from this browser?")) return;
    setBusy(true);
    setError("");
    try {
      await clearReadingHistory();
      setHistory([]);
      window.dispatchEvent(new Event("mikoroku:reading-history-updated"));
    } catch (error) {
      console.error("Could not clear reading history.", error);
      setError("Could not clear reading history from every browser storage location.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <GlobalAuth />
      <UserModals />
      <MangaDataProvider />
      <SiteHeader />
      <main className="reading-history-route route-page-background">
        <section className="reading-history-container" aria-labelledby="reading-history-title">
          <header className="reading-history-header">
            <div>
              <h1 id="reading-history-title"><i className="fas fa-history" aria-hidden="true" /> Reading History</h1>
              <p>Continue where you left off and track your progress in each chapter.</p>
            </div>
            {history.length > 0 && (
              <button type="button" className="reading-history-clear" onClick={() => void clearHistory()} disabled={busy}>
                <i className="fas fa-trash" aria-hidden="true" /> Clear all
              </button>
            )}
          </header>

          {error && <p className="reading-history-error" role="alert">{error}</p>}

          {history.length === 0 ? (
            <div className="reading-history-empty">
              <i className="fas fa-book-open" aria-hidden="true" />
              <h2>No reading history yet</h2>
              <p>Chapters you read will appear here.</p>
              <Link href="/manga-list">Explore manga</Link>
            </div>
          ) : (
            <ul className="reading-history-list">
              {history.map((entry) => {
                const progress = entry.progress || 0;
                return (
                  <li className="reading-history-card" key={entry.url}>
                    <Link className="reading-history-open" href={entry.url}>
                      <span className="reading-history-cover">
                        <CoverImage
                          src={coverUrl(entry.cover || "")}
                          alt=""
                          loading="lazy"
                          onError={(event) => { event.currentTarget.src = FALLBACK_COVER; }}
                        />
                      </span>
                      <span className="reading-history-info">
                        <strong className="reading-history-title">{entry.series || entry.title || "Unknown"}</strong>
                        <span className="reading-history-chapter">{entry.chapter || "Chapter"}</span>
                        <span className="reading-history-progress-label">
                          Chapter progress <strong>{progress}%</strong>
                        </span>
                        <span
                          className="reading-history-progress"
                          role="progressbar"
                          aria-label={`Reading progress for ${entry.chapter || "chapter"}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={progress}
                        >
                          <span style={{ width: `${progress}%` }} />
                        </span>
                        <span className="reading-history-time">{formatElapsed(entry.time)}</span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      className="reading-history-delete"
                      aria-label={`Remove ${entry.series || entry.title || "title"} from reading history`}
                      disabled={busy}
                      onClick={() => void deleteEntry(entry.url)}
                    >
                      <i className="fas fa-trash" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
