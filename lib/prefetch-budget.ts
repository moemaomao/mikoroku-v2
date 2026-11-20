/**
 * Client-side prefetch budget.
 * Prevents "prefetch everything" from exploding Workers requests (Error 1027).
 */

type PrefetchTask = () => Promise<void> | void;

const MAX_CONCURRENT = 2;
const DEBOUNCE_MS = 180;
const COOLDOWN_PER_SLUG_MS = 30_000;

let inFlight = 0;
const queue: PrefetchTask[] = [];
const lastPrefetchAt = new Map<string, number>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function pump() {
  while (inFlight < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift()!;
    inFlight += 1;
    Promise.resolve()
      .then(task)
      .catch(() => {})
      .finally(() => {
        inFlight -= 1;
        pump();
      });
  }
}

export function schedulePrefetch(slug: string, task: PrefetchTask): void {
  const now = Date.now();
  const last = lastPrefetchAt.get(slug) ?? 0;
  if (now - last < COOLDOWN_PER_SLUG_MS) return;

  const existing = debounceTimers.get(slug);
  if (existing) clearTimeout(existing);

  debounceTimers.set(
    slug,
    setTimeout(() => {
      debounceTimers.delete(slug);
      lastPrefetchAt.set(slug, Date.now());
      queue.push(task);
      pump();
    }, DEBOUNCE_MS),
  );
}

export function prefetchSeriesRoute(slug: string): void {
  if (typeof window === "undefined") return;

  schedulePrefetch(slug, () => {
    try {
      return import("next/navigation").then(() => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = `/series/${encodeURIComponent(slug)}`;
        link.as = "document";
        document.head.appendChild(link);
      });
    } catch {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = `/series/${encodeURIComponent(slug)}`;
      document.head.appendChild(link);
    }
  });
}

let detailChunkWarmed = false;
export function warmDetailChunk(importFn: () => Promise<unknown>): void {
  if (detailChunkWarmed || typeof window === "undefined") return;
  detailChunkWarmed = true;
  schedulePrefetch("__detail_chunk__", () => {
    void importFn().catch(() => {});
  });
}
