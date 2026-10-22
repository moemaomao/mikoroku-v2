"use client";

import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState, type ReactNode } from "react";

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

function renderInlineMarkdown(value: string, keyPrefix: string) {
  const tokens = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokens.exec(value)) !== null) {
    if (match.index > cursor) parts.push(value.slice(cursor, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
    if (link) {
      const url = link[2].trim();
      if (/^(https?:\/\/|mailto:)/i.test(url)) {
        parts.push(
          <a href={url} key={key} target="_blank" rel="noreferrer">
            {link[1]}
          </a>,
        );
      } else {
        parts.push(link[1]);
      }
    } else if (token.startsWith("**") || token.startsWith("__")) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("~~")) {
      parts.push(<del key={key}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    cursor = match.index + token.length;
  }

  if (cursor < value.length) parts.push(value.slice(cursor));
  return parts;
}

function MarkdownContent({ value }: { value: string }) {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let blockNumber = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const codeFence = /^```([a-z0-9_-]*)$/i.exec(line);
    if (codeFence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <pre key={`block-${blockNumber++}`}>
          <code className={codeFence[1] ? `language-${codeFence[1]}` : undefined}>
            {codeLines.join("\n")}
          </code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const headingContent = renderInlineMarkdown(heading[2], `heading-${blockNumber}`);
      const key = `block-${blockNumber++}`;
      const HeadingTag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      blocks.push(<HeadingTag key={key}>{headingContent}</HeadingTag>);
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      blocks.push(<hr key={`block-${blockNumber++}`} />);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`block-${blockNumber++}`}>
          {quoteLines.map((quoteLine, quoteIndex) => (
            <p key={`quote-${quoteIndex}`}>
              {renderInlineMarkdown(quoteLine, `quote-${blockNumber}-${quoteIndex}`)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    const listMatch = /^([-*+]|\d+\.)\s+(.+)$/.exec(line);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const item = /^([-*+]|\d+\.)\s+(.+)$/.exec(lines[index].trim());
        if (!item || /^\d/.test(item[1]) !== ordered) break;
        items.push(
          <li key={`item-${items.length}`}>
            {renderInlineMarkdown(item[2], `list-${blockNumber}-${items.length}`)}
          </li>,
        );
        index += 1;
      }
      const key = `block-${blockNumber++}`;
      blocks.push(ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6}\s|```|>\s?|[-*+]\s+|\d+\.\s+|(-{3,}|\*{3,}|_{3,})$)/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    const paragraphNumber = blockNumber++;
    blocks.push(
      <p key={`block-${paragraphNumber}`}>
        {renderInlineMarkdown(paragraphLines.join(" "), `paragraph-${paragraphNumber}`)}
      </p>,
    );
  }

  return (
    <div
      className="mt-3.5 break-words text-[15px] leading-[1.75] text-[#3d414d] max-[600px]:text-[14px] dark:text-[#d7d9df] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-3 [&_h1]:mt-5 [&_h1]:mb-[9px] [&_h1]:leading-[1.3] [&_h1]:text-[1.65em] [&_h2]:mt-5 [&_h2]:mb-[9px] [&_h2]:leading-[1.3] [&_h2]:text-[1.45em] [&_h3]:mt-5 [&_h3]:mb-[9px] [&_h3]:leading-[1.3] [&_h3]:text-[1.25em] [&_h4]:mt-5 [&_h4]:mb-[9px] [&_h4]:leading-[1.3] [&_h4]:text-[1.1em] [&_h5]:mt-5 [&_h5]:mb-[9px] [&_h5]:leading-[1.3] [&_h5]:text-[1.1em] [&_h6]:mt-5 [&_h6]:mb-[9px] [&_h6]:leading-[1.3] [&_h6]:text-[1.1em] [&_ul]:mb-3.5 [&_ul]:pl-6 [&_ol]:mb-3.5 [&_ol]:pl-6 [&_li+li]:mt-1 [&_blockquote]:my-3.5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#b43c42] [&_blockquote]:bg-[rgb(180_60_66/7%)] [&_blockquote]:px-3.5 [&_blockquote]:py-2 [&_blockquote_p:last-child]:mb-0 [&_a]:text-[#a32d35] [&_a]:underline [&_a]:underline-offset-2 dark:[&_a]:text-[#ff9298] [&_pre]:my-3.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[#f0f1f4] [&_pre]:p-3.5 dark:[&_pre]:bg-[#12131a] [&_code]:rounded [&_code]:bg-[rgb(35_40_55/8%)] [&_code]:px-[5px] [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] dark:[&_code]:bg-[rgb(255_255_255/10%)] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_hr]:my-[18px] [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-solid [&_hr]:border-[rgb(35_40_55/14%)] dark:[&_hr]:border-[rgb(255_255_255/15%)]"
    >
      {blocks}
    </div>
  );
}

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
