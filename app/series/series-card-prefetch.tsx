"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { preloadDetailPageContent } from "./detail-page-client";

type SeriesCardPrefetchProps = {
  slug: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
  prefetchOnHover?: boolean;
  prefetchOnVisible?: boolean;
};

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
    preloadDetailPageContent();
  }, []);

  const onMouseEnter = prefetchOnHover ? warm : undefined;
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
      data-slug={slug}
      onMouseEnter={onMouseEnter}
      onPointerDown={warm}
      prefetch={false}
    >
      {children}
    </Link>
  );
}
