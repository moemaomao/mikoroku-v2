"use client";

import Link from "next/link";
import { type MouseEvent, type ReactNode } from "react";

type SeriesCardPrefetchProps = {
  slug: string;
  href?: string;
  className?: string;
  children: ReactNode;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function SeriesCardPrefetch({
  slug,
  href,
  className,
  children,
  onNavigate,
}: SeriesCardPrefetchProps) {
  const targetHref = href ?? `/series/${encodeURIComponent(slug)}`;

  return (
    <Link
      href={targetHref}
      className={className}
      data-slug={slug}
      prefetch={false}
      onClick={(event) => {
        onNavigate?.(event);
      }}
    >
      {children}
    </Link>
  );
}