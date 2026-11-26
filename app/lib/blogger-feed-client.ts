export type BloggerFeedEntry = {
  title?: { $t?: string };
  link?: Array<{ rel?: string; href?: string }>;
  content?: { $t?: string };
  updated?: { $t?: string };
  published?: { $t?: string };
};

export type BloggerFeedPayload = {
  feed?: { entry?: BloggerFeedEntry[] };
};

export type BloggerFeedSource = "blogger" | "blogger2";

const bloggerFeedDomains: Record<BloggerFeedSource, string> = {
  blogger: "https://www.mikodrive.my.id",
  blogger2: "https://www.yomidays.my.id",
};

function getJsonp<T>(url: string, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Blogger feed request was cancelled.", "AbortError"));
      return;
    }

    const callbackName = `mikorokuBloggerJsonp${Date.now()}${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const globalWindow = window as typeof window & Record<string, unknown>;
    let settled = false;
    const finish = (error?: Error, data?: T) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      script.remove();
      delete globalWindow[callbackName];
      if (error) reject(error);
      else resolve(data as T);
    };
    const onAbort = () => finish(new DOMException("Blogger feed request was cancelled.", "AbortError"));
    const timeout = window.setTimeout(
      () => finish(new Error("Timed out while loading a Blogger feed.")),
      15000,
    );
    globalWindow[callbackName] = (data: T) => finish(undefined, data);
    script.onerror = () => finish(new Error("Failed to load a Blogger feed."));
    signal.addEventListener("abort", onAbort, { once: true });

    const feedUrl = new URL(url);
    feedUrl.searchParams.set("callback", callbackName);
    script.src = feedUrl.href;
    document.head.appendChild(script);
  });
}

export function fetchBloggerFeed(
  source: BloggerFeedSource,
  title: string,
  signal: AbortSignal,
  options: { maxResults?: number; query?: string } = {},
): Promise<BloggerFeedPayload> {
  const feedUrl = new URL("/feeds/posts/default", bloggerFeedDomains[source]);
  feedUrl.searchParams.set("alt", "json-in-script");
  feedUrl.searchParams.set("max-results", String(options.maxResults ?? 500));
  feedUrl.searchParams.set("q", options.query ?? title.trim());
  return getJsonp<BloggerFeedPayload>(feedUrl.href, signal);
}
