import type { MouseEvent as ReactMouseEvent } from "react";

const HOMEPAGE_SERIES_NAVIGATION_KEY = "mikoroku:homepage-series-navigation";
const NAVIGATION_MARKER_TTL = 10 * 60 * 1000;

type HomepageNavigationMarker = {
  pathname: string;
  createdAt: number;
};

function isUnmodifiedPrimaryClick(event: ReactMouseEvent): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function markHomepageSeriesNavigation(
  pathname: string,
  event: ReactMouseEvent,
): void {
  if (
    typeof window === "undefined" ||
    window.location.pathname !== "/" ||
    !isUnmodifiedPrimaryClick(event)
  ) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      HOMEPAGE_SERIES_NAVIGATION_KEY,
      JSON.stringify({
        pathname,
        createdAt: Date.now(),
      } satisfies HomepageNavigationMarker),
    );
  } catch (error) {
    console.warn(
      "Homepage navigation could not be cached for a fast return.",
      error,
    );
  }
}

export function returnToHomepageIfPossible(
  event: ReactMouseEvent<HTMLAnchorElement>,
): void {
  if (typeof window === "undefined" || !isUnmodifiedPrimaryClick(event)) return;
  if (window.location.pathname === "/") return;

  let marker: HomepageNavigationMarker | null = null;
  try {
    const raw = window.sessionStorage.getItem(HOMEPAGE_SERIES_NAVIGATION_KEY);
    marker = raw
      ? (JSON.parse(raw) as HomepageNavigationMarker)
      : null;
  } catch (error) {
    console.warn("Homepage navigation cache could not be read.", error);
  }

  const canRestoreHomepage =
    window.location.pathname.startsWith("/series/") &&
    marker !== null &&
    marker.pathname === window.location.pathname &&
    Date.now() - marker.createdAt < NAVIGATION_MARKER_TTL &&
    window.history.length > 1 &&
    document.readyState === "complete";

  try {
    window.sessionStorage.removeItem(HOMEPAGE_SERIES_NAVIGATION_KEY);
  } catch (error) {
    console.warn("Homepage navigation cache could not be cleared.", error);
  }

  if (canRestoreHomepage) {
    event.preventDefault();
    window.history.back();
  }
}