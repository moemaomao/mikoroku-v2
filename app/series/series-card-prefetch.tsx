"use client";

import Link from "next/link";
import { useCallback, useRef, type MouseEvent, type ReactNode } from "react";
import { preloadDetailPageContent } from "./detail-page-client";

type SeriesCardPrefetchProps = {
  slug: string;
  href?: string;
  className?: string;
  children: ReactNode;
  prefetchOnHover?: boolean;
  prefetchOnVisible?: boolean;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function SeriesCardPrefetch({
  slug,
  href,
  className,
  children,
  prefetchOnHover = true,
  prefetchOnVisible = false,
  onNavigate,
}: SeriesCardPrefetchProps) {
  const warmedRef = useRef(false);
  const targetHref = href ?? `/series/${encodeURIComponent(slug)}`;

  const warm = useCallback(() => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    preloadDetailPageContent();
  }, []);

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
      prefetch={true}
      onMouseEnter={prefetchOnHover ? warm : undefined}
      onPointerDown={warm}
      onClick={(event) => {
        onNavigate?.(event);
      }}
    >
      {children}
    </Link>
  );
}