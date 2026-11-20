"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { prefetchSeriesRoute, warmDetailChunk } from "../../lib/prefetch-budget";
import { preloadDetailPageContent } from "./detail-page-client";

type SeriesCardPrefetchProps = {
  slug: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
  /** Prefetch on hover (default true) */
  prefetchOnHover?: boolean;
  /** Prefetch when card enters viewport (default false — safer for quota) */
  prefetchOnVisible?: boolean;
};

/**
 * Drop-in wrapper for manga cards on the homepage / lists.
 * Uses a hard budget so scrolling the catalog cannot open hundreds of Worker requests.
 */
export default function SeriesCardPrefetch({
  slug,
  href,
  className,
  children,
  prefetchOnHover = true,
  prefetchOnVisible = false,
}: SeriesCardPrefetchProps) {
  const warmedRef = useRef(false);
  const targetHref = href ?? `/series/${encodeURIComponent(slug)}`;

  const warm = useCallback(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    warmDetailChunk(() => import("./detail-page-content"));
    preloadDetailPageContent();
    prefetchSeriesRoute(slug);
  }, [slug]);

  const onMouseEnter = prefetchOnHover ? warm : undefined;

  // Optional: IntersectionObserver for visible cards only
  const setNode = useCallback(
    (node: HTMLAnchorElement | null) => {
      if (!node || !prefetchOnVisible) return;
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            warm();
            io.disconnect();
          }
        },
        { rootMargin: "120px" },
      );
      io.observe(node);
      return () => io.disconnect();
    },
    [prefetchOnVisible, warm],
  );

  return (
    <Link
      ref={setNode}
      href={targetHref}
      className={className}
      onMouseEnter={onMouseEnter}
      // Let Next prefetch the route when the link is in viewport (built-in, limited)
      prefetch={true}
    >
      {children}
    </Link>
  );
}
