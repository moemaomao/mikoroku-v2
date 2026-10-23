"use client";

import { useEffect, useState } from "react";
import "./community-widgets.css";

declare global {
  interface Window {
    DOMPurify?: unknown;
    md5?: unknown;
    showReplyNotifications?: () => void;
    closeReplyNotifications?: () => void;
    loadUserNotifications?: () => void;
    closeEmailModal?: () => void;
    closeDmModal?: () => void;
    closeProfileModal?: () => void;
  }
}

type CommunityWidgetsProps = {
  pageId: string;
  className?: string;
};

const widgets = [
  { id: "custom-comment-widget", path: "/Features/Hakoroku/comment.html" },
  { id: "emoji-widget", path: "/Features/emoji-reaction.html" },
];

const STYLE_ATTR = "data-mikoroku-widget-style";

function parseWidgetHtml(raw: string): { bodyHtml: string; styleHtml: string } {
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let bodyHtml = bodyMatch ? bodyMatch[1] : raw;

  const styles = raw.match(/<style[\s\S]*?<\/style>/gi) || [];
  const links = raw.match(/<link[^>]*>/gi) || [];
  const styleHtml = [...styles, ...links].join("\n");

  bodyHtml = bodyHtml
    .replace(/<!DOCTYPE[\s\S]*?>/i, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<link[^>]*>/gi, "");

  return { bodyHtml, styleHtml };
}

function injectWidgetStyles(styleHtml: string, owner: string) {
  if (!styleHtml.trim()) return;
  if (document.head.querySelector(`[${STYLE_ATTR}="${owner}"]`)) return;

  const wrap = document.createElement("div");
  wrap.innerHTML = styleHtml;
  [...wrap.childNodes].forEach((node) => {
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    el.setAttribute(STYLE_ATTR, owner);
    document.head.appendChild(el);
  });
}

export default function CommunityWidgets({ pageId, className = "" }: CommunityWidgetsProps) {
  const [widgetError, setWidgetError] = useState("");
  const communityPageId = pageId.replace(/[^a-zA-Z0-9_-]/g, "_");

  useEffect(() => {
    let cancelled = false;
    const cleanups: Array<() => void> = [];
    document.documentElement.dataset.communityPageId = communityPageId;

    async function loadWidgets() {
      try {
        for (const widget of widgets) {
          const container = document.getElementById(widget.id);
          if (!container || cancelled) return;

          if (widget.id === "custom-comment-widget") {
            const frame = document.createElement("iframe");
            frame.title = "Komentar komunitas";
            frame.style.cssText = "display:block;width:100%;height:900px;border:0;overflow:hidden";
            frame.setAttribute("scrolling", "no");
            let parentScrollState: {
              scrollY: number;
              htmlOverflow: string;
              bodyOverflow: string;
              bodyPosition: string;
              bodyTop: string;
              bodyWidth: string;
            } | null = null;
            const setParentScrollLock = (locked: boolean) => {
              if (locked && !parentScrollState) {
                parentScrollState = {
                  scrollY: window.scrollY,
                  htmlOverflow: document.documentElement.style.overflow,
                  bodyOverflow: document.body.style.overflow,
                  bodyPosition: document.body.style.position,
                  bodyTop: document.body.style.top,
                  bodyWidth: document.body.style.width,
                };
                document.documentElement.style.overflow = "hidden";
                document.body.style.overflow = "hidden";
                document.body.style.position = "fixed";
                document.body.style.top = `-${parentScrollState.scrollY}px`;
                document.body.style.width = "100%";
              } else if (!locked && parentScrollState) {
                const previous = parentScrollState;
                parentScrollState = null;
                document.documentElement.style.overflow = previous.htmlOverflow;
                document.body.style.overflow = previous.bodyOverflow;
                document.body.style.position = previous.bodyPosition;
                document.body.style.top = previous.bodyTop;
                document.body.style.width = previous.bodyWidth;
                window.scrollTo(0, previous.scrollY);
              }
            };
            container.replaceChildren(frame);

            const resizeFrame = () => {
              const frameDocument = frame.contentDocument;
              if (!frameDocument?.body) return;
              frame.style.height = `${Math.max(
                frameDocument.documentElement.scrollHeight,
                frameDocument.body.scrollHeight,
              )}px`;
            };
            const observeFrame = () => {
              const frameDocument = frame.contentDocument;
              const frameWindow = frame.contentWindow;
              if (!frameDocument?.body || !frameWindow || cancelled) return;
              const modalBackdropStyles = frameDocument.createElement("style");
              modalBackdropStyles.textContent = `
                :root {
                  color-scheme: light;
                  --background: #fff;
                  --text: #222;
                  --border: #ddd;
                  --muted: #777;
                }
                html.dark {
                  color-scheme: light;
                  --background: #111318;
                  --text: #e8e8ed;
                  --border: #444752;
                  --muted: #a5a7b0;
                }
                html,
                body,
                #comment-widget-section {
                  background: transparent !important;
                }
                body {
                  color: var(--text) !important;
                }
                #comment-widget {
                  background: transparent !important;
                  color: var(--text) !important;
                }
                #comments-list,
                #comment-form-container,
                #comment-form {
                  background: transparent !important;
                  color: var(--text) !important;
                }
                #comment-form input[type="text"],
                #comment-form textarea,
                .reply-form input[type="text"],
                .reply-form textarea,
                .edit-form textarea {
                  border-color: rgba(31, 41, 55, 0.72) !important;
                  background: rgba(0, 0, 0, 0.1) !important;
                  color: var(--text) !important;
                }
                html.dark #comment-form input[type="text"],
                html.dark #comment-form textarea,
                html.dark .reply-form input[type="text"],
                html.dark .reply-form textarea,
                html.dark .edit-form textarea {
                  border-color: rgba(255, 255, 255, 0.48) !important;
                  background: rgba(15, 18, 24, 0.24) !important;
                  color: var(--text) !important;
                }
                @media (max-width: 767px) {
                  body {
                    padding: 8px !important;
                  }
                  #comment-widget {
                    padding-right: 4px !important;
                    padding-left: 4px !important;
                  }
                  #comment-form-container {
                    margin: 20px 0 !important;
                    padding-right: 0 !important;
                    padding-left: 0 !important;
                  }
                }
                #comment-form input::placeholder,
                #comment-form textarea::placeholder,
                .reply-form input::placeholder,
                .reply-form textarea::placeholder,
                .edit-form textarea::placeholder {
                  color: var(--muted) !important;
                  opacity: 1;
                }
                #comment-form input::placeholder,
                #comment-form textarea::placeholder {
                  color: var(--muted) !important;
                }
                #comment-widget .comment-text,
                #comment-widget .comment-date,
                #comment-widget #comments-title,
                #comment-widget .no-comments {
                  color: var(--text) !important;
                }
                .no-comments {
                  color: var(--text) !important;
                  background: transparent !important;
                }
                .email-modal,
                #user-settings-modal,
                #dm-modal,
                #report-modal,
                #reply-notif-overlay,
                #user-profile-modal {
                  position: fixed !important;
                  inset: 0 !important;
                  background: transparent !important;
                  backdrop-filter: none !important;
                  -webkit-backdrop-filter: none !important;
                  overflow: hidden !important;
                  overscroll-behavior: contain;
                }
                .email-modal-card,
                #user-settings-box,
                .dm-wrapper,
                #report-modal-content,
                #user-profile-modal > :first-child,
                #reply-notif-overlay > :first-child {
                  max-height: calc(100dvh - 32px) !important;
                  overflow-y: auto !important;
                  overscroll-behavior: contain;
                }
                html.modal-open,
                html.modal-open body {
                  overflow: hidden !important;
                }
                #comment-widget {
                  color-scheme: light;
                }
                html.dark #comment-widget {
                  color-scheme: dark;
                }
              `;
              frameDocument.head.appendChild(modalBackdropStyles);
              const syncTheme = () => {
                frameDocument.documentElement.classList.toggle(
                  "dark",
                  document.documentElement.classList.contains("dark"),
                );
              };
              syncTheme();
              const themeObserver = new MutationObserver(syncTheme);
              themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["class"],
              });

              const modalSelectors = [
                ".email-modal",
                "#user-settings-modal",
                "#dm-modal",
                "#report-modal",
                "#reply-notif-overlay",
                "#user-profile-modal",
              ];
              let modalCheckFrame = 0;
              const syncModalScroll = () => {
                modalCheckFrame = 0;
                const hasOpenModal = modalSelectors.some((selector) => {
                  const modal = frameDocument.querySelector(selector);
                  return Boolean(modal && frameWindow.getComputedStyle(modal).display !== "none" &&
                    modal.getBoundingClientRect().width > 0);
                });
                frameDocument.documentElement.classList.toggle("modal-open", hasOpenModal);
                setParentScrollLock(hasOpenModal);
              };
              const scheduleModalScrollSync = () => {
                if (!modalCheckFrame) {
                  modalCheckFrame = frameWindow.requestAnimationFrame(syncModalScroll);
                }
              };
              const closeModal = (modal: HTMLElement) => {
                switch (modal.id) {
                  case "email-auth-modal":
                    frameWindow.closeEmailModal?.();
                    break;
                  case "user-settings-modal":
                    modal.style.display = "none";
                    break;
                  case "dm-modal":
                    frameWindow.closeDmModal?.();
                    break;
                  case "report-modal":
                    modal.style.display = "none";
                    break;
                  case "reply-notif-overlay":
                    frameWindow.closeReplyNotifications?.();
                    break;
                  case "user-profile-modal":
                    frameWindow.closeProfileModal?.();
                    break;
                }
                scheduleModalScrollSync();
              };
              const closeModalOnBackdrop = (event: MouseEvent) => {
                const target = event.target;
                const ElementConstructor = frameDocument.defaultView?.Element;
                if (!ElementConstructor || !(target instanceof ElementConstructor)) return;
                const modal = target.closest<HTMLElement>(modalSelectors.join(","));
                if (modal && target === modal) closeModal(modal);
              };
              const closeModalOnEscape = (event: KeyboardEvent) => {
                if (event.key !== "Escape") return;
                const openModal = modalSelectors
                  .map((selector) => frameDocument.querySelector<HTMLElement>(selector))
                  .find((modal) => modal && frameWindow.getComputedStyle(modal).display !== "none");
                if (openModal) closeModal(openModal);
              };
              frameDocument.addEventListener("click", closeModalOnBackdrop);
              frameDocument.addEventListener("click", scheduleModalScrollSync, true);
              frameDocument.addEventListener("keydown", closeModalOnEscape);
              const modalObserver = new MutationObserver(scheduleModalScrollSync);
              modalObserver.observe(frameDocument.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["style", "class"],
              });
              scheduleModalScrollSync();

              const resizeObserver = new ResizeObserver(resizeFrame);
              resizeObserver.observe(frameDocument.documentElement);
              resizeObserver.observe(frameDocument.body);
              const mutationObserver = new MutationObserver(resizeFrame);
              mutationObserver.observe(frameDocument.body, {
                childList: true,
                subtree: true,
                attributes: true,
              });
              cleanups.push(() => {
                resizeObserver.disconnect();
                mutationObserver.disconnect();
                themeObserver.disconnect();
                modalObserver.disconnect();
                frameDocument.removeEventListener("click", closeModalOnBackdrop);
                frameDocument.removeEventListener("click", scheduleModalScrollSync, true);
                frameDocument.removeEventListener("keydown", closeModalOnEscape);
                if (modalCheckFrame) frameWindow.cancelAnimationFrame(modalCheckFrame);
                modalBackdropStyles.remove();
                frameDocument.documentElement.classList.remove("modal-open");
              });
              resizeFrame();
              window.requestAnimationFrame(resizeFrame);
            };
            frame.addEventListener("load", observeFrame);
            frame.addEventListener("error", () => {
              if (!cancelled) setWidgetError("Widget komentar gagal dimuat.");
            });
            cleanups.push(() => {
              frame.removeEventListener("load", observeFrame);
              setParentScrollLock(false);
            });
            frame.src = `${widget.path}?pageId=${encodeURIComponent(communityPageId)}`;
            continue;
          }

          const deadline = Date.now() + 15000;
          while (!window.firebase?.firestore && Date.now() < deadline) {
            await new Promise((resolve) => window.setTimeout(resolve, 100));
          }
          if (!window.firebase?.firestore) throw new Error("Reaksi komunitas saat ini tidak tersedia.");

          const response = await fetch(widget.path);
          if (!response.ok) throw new Error(`Widget ${widget.id} returned HTTP ${response.status}.`);

          const raw = await response.text();
          const { bodyHtml, styleHtml } = parseWidgetHtml(raw);

          injectWidgetStyles(styleHtml, widget.id);

          const template = document.createElement("template");
          template.innerHTML = bodyHtml;
          const scripts = [...template.content.querySelectorAll("script")];
          scripts.forEach((script) => script.remove());
          template.content.querySelectorAll("title").forEach((t) => t.remove());
          container.replaceChildren(template.content);

          for (const original of scripts) {
            if (cancelled) return;
            if (original.src && isLibraryAvailable(original.src)) continue;

            const script = document.createElement("script");
            if (original.type) script.type = original.type;
            if (original.src) {
              script.src = original.src;
              script.async = false;
            } else {
              script.textContent = original.textContent;
            }
            document.body.appendChild(script);
            if (original.src) {
              await new Promise<void>((resolve, reject) => {
                script.addEventListener("load", () => resolve(), { once: true });
                script.addEventListener("error", () => reject(new Error(`Failed to load ${original.src}`)), { once: true });
              });
            }
          }

        }
      } catch (error) {
        if (cancelled) return;
        console.error("Community widgets failed to load.", error);
        setWidgetError(error instanceof Error ? error.message : "Community widgets failed to load.");
      }
    }

    void loadWidgets();
    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
      document.getElementById("custom-comment-widget")?.replaceChildren();
      if (document.documentElement.dataset.communityPageId === communityPageId) {
        delete document.documentElement.dataset.communityPageId;
      }
    };
  }, [communityPageId]);

  return (
    <section className={`community-widgets ${className}`.trim()} aria-label="Comments and reactions">
      <div id="emoji-widget" className="community-reactions" />
      <div id="custom-comment-widget" className="community-comments" />
      {widgetError && <p className="community-widget-error" role="status">{widgetError}</p>}
    </section>
  );
}

function isLibraryAvailable(src: string): boolean {
  if (src.includes("firebase-app-compat.js")) return Boolean(window.firebase?.apps?.length);
  if (src.includes("firebase-auth-compat.js")) return Boolean(window.firebase?.auth);
  if (src.includes("firebase-firestore-compat.js")) return Boolean(window.firebase?.firestore);
  if (src.includes("purify.min.js")) return Boolean(window.DOMPurify);
  if (src.includes("md5.min.js")) return Boolean(window.md5);
  return false;
}
