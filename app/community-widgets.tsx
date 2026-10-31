"use client";

import { useEffect, useRef, useState } from "react";
import "./community-widgets.css";

declare global {
  interface Window {
    DOMPurify?: unknown;
    md5?: unknown;
    setCommentCommunityPageId?: (pageId: string) => void;
    __mikorokuCommunityWidgets?: CommunityWidgetRuntime;
  }
}

type CommunityWidgetsProps = {
  pageId: string;
  className?: string;
};

type CommunityWidgetRuntime = {
  root: HTMLElement;
  parking: HTMLElement;
  pageId: string;
  initialization: Promise<void> | null;
  commentElement: (HTMLElement & { pageId?: string }) | null;
  emojiElement: (HTMLElement & { pageId?: string }) | null;
};

const COMMENT_SCRIPT_SRC = "/widgets/comment-widget.js";
const EMOJI_SCRIPT_SRC = "/widgets/emoji-reaction.js";

function getCommunityRuntime(): CommunityWidgetRuntime {
  const existing = window.__mikorokuCommunityWidgets;
  if (existing) return existing;

  const root = document.createElement("section");
  root.className = "community-widgets";
  root.setAttribute("aria-label", "Comments and reactions");
  root.innerHTML = `
    <div id="emoji-widget" class="community-reactions"></div>
    <div id="custom-comment-widget" class="community-comments"></div>
  `;

  const parking = document.createElement("div");
  parking.hidden = true;
  parking.setAttribute("data-community-widget-parking", "");
  document.body.appendChild(parking);
  parking.appendChild(root);

  const runtime: CommunityWidgetRuntime = {
    root,
    parking,
    pageId: "",
    initialization: null,
    commentElement: null,
    emojiElement: null,
  };
  window.__mikorokuCommunityWidgets = runtime;
  return runtime;
}

async function initializeWidgets(runtime: CommunityWidgetRuntime) {
  await Promise.all([
    loadCommentWidget(runtime),
    loadEmojiWidget(runtime),
  ]);
}

async function loadCommentWidget(runtime: CommunityWidgetRuntime) {
  const container = runtime.root.querySelector<HTMLElement>("#custom-comment-widget");
  if (!container) throw new Error("Widget container custom-comment-widget was not found.");

  if (!customElements.get("mikoroku-comment-widget")) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = COMMENT_SCRIPT_SRC;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${COMMENT_SCRIPT_SRC}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  const element = document.createElement("mikoroku-comment-widget") as HTMLElement & { pageId?: string };
  element.setAttribute("page-id", runtime.pageId);
  element.pageId = runtime.pageId;
  container.replaceChildren(element);
  runtime.commentElement = element;
}

async function loadEmojiWidget(runtime: CommunityWidgetRuntime) {
  const container = runtime.root.querySelector<HTMLElement>("#emoji-widget");
  if (!container) throw new Error("Widget container emoji-widget was not found.");

  if (!customElements.get("mikoroku-emoji-reaction")) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = EMOJI_SCRIPT_SRC;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${EMOJI_SCRIPT_SRC}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  const element = document.createElement("mikoroku-emoji-reaction") as HTMLElement & { pageId?: string };
  element.setAttribute("page-id", runtime.pageId);
  element.pageId = runtime.pageId;
  container.replaceChildren(element);
  runtime.emojiElement = element;
}

export default function CommunityWidgets({ pageId, className = "" }: CommunityWidgetsProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [widgetError, setWidgetError] = useState("");
  const communityPageId = pageId.replace(/[^a-zA-Z0-9_-]/g, "_");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const runtime = getCommunityRuntime();
    document.documentElement.dataset.communityPageId = communityPageId;
    runtime.pageId = communityPageId;
    runtime.root.className = `community-widgets ${className}`.trim();
    runtime.root.hidden = false;
    mount.appendChild(runtime.root);

    let active = true;
    const updatePageId = () => {
      window.setCommentCommunityPageId?.(communityPageId);
      runtime.commentElement?.setAttribute("page-id", communityPageId);
      if (runtime.commentElement) runtime.commentElement.pageId = communityPageId;
      runtime.emojiElement?.setAttribute("page-id", communityPageId);
      if (runtime.emojiElement) runtime.emojiElement.pageId = communityPageId;
    };

    let initialized = false;
    let fallbackTimer: number | null = null;
    const initializeWhenVisible = () => {
      if (initialized) return;
      initialized = true;
      observer?.disconnect();
      if (!runtime.initialization) {
        runtime.initialization = initializeWidgets(runtime);
      } else {
        updatePageId();
      }

      void runtime.initialization
        .then(() => {
          if (!active) return;
          updatePageId();
          setWidgetError("");
        })
        .catch((error: unknown) => {
          if (!active) return;
          console.error("Community widgets failed to load.", error);
          setWidgetError(error instanceof Error ? error.message : "Community widgets failed to load.");
        });
    };

    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          initializeWhenVisible();
        },
        { rootMargin: "600px 0px" },
      );
      observer.observe(runtime.root);
    } else {
      initializeWhenVisible();
    }
    fallbackTimer = window.setTimeout(initializeWhenVisible, 1500);

    if (runtime.initialization) {
      initializeWhenVisible();
    }

    return () => {
      active = false;
      observer?.disconnect();
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      runtime.root.hidden = true;
      runtime.parking.appendChild(runtime.root);
      if (document.documentElement.dataset.communityPageId === communityPageId) {
        delete document.documentElement.dataset.communityPageId;
      }
    };
  }, [communityPageId, className]);

  return (
    <div
      ref={mountRef}
      className="community-widget-mount"
      aria-label={widgetError ? "Community widgets unavailable" : undefined}
    >
      {widgetError && <p className="community-widget-error" role="status">{widgetError}</p>}
    </div>
  );
}
