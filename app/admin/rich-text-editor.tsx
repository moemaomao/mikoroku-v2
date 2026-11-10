"use client";

import type Clipboard from "quill/modules/clipboard";
import type Quill from "quill";
import { useEffect, useRef, useState } from "react";

type SearchHighlightRegistry = {
  set: (name: string, highlight: object) => void;
  delete: (name: string) => void;
};

type SearchHighlightWindow = Window & {
  CSS: typeof CSS & { highlights?: SearchHighlightRegistry };
  Highlight?: new (...ranges: Range[]) => object;
};

const SEARCH_HIGHLIGHT = "mikoroku-chapter-search";
const CURRENT_SEARCH_HIGHLIGHT = "mikoroku-chapter-search-current";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  kind: "description" | "chapter";
};

const toolbars = {
  description: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
  chapter: [
    ["bold", "italic", "underline"],
    [{ size: ["small", false, "large", "huge"] }],
    [{ header: [1, 2, 3, false] }],
    [{ align: [] }],
    ["clean"],
  ],
};

export default function RichTextEditor({
  value,
  onChange,
  kind,
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Quill | null>(null);
  const matchRangesRef = useRef<Range[]>([]);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [editorReady, setEditorReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;

    async function initializeEditor() {
      const container = containerRef.current;
      if (!container) return;
      const { default: QuillConstructor } = await import("quill");
      if (cancelled || !containerRef.current) return;

      const chapterPage = container.closest<HTMLElement>(
        "[data-chapter-editor-page]",
      );
      const chapterPageScrollTop = chapterPage?.scrollTop ?? 0;
      const windowScrollX = window.scrollX;
      const windowScrollY = window.scrollY;
      const editor = new QuillConstructor(container, {
        theme: "snow",
        placeholder:
          kind === "description"
            ? "Write manga description..."
            : "Novel chapter content (optional)...",
        modules: { toolbar: toolbars[kind] },
      });
      if (kind === "chapter") {
        editor.root.setAttribute("aria-labelledby", "chapter-content-label");
      }
      if (kind === "chapter") {
        const clipboard = editor.getModule("clipboard") as Clipboard;
        clipboard.addMatcher(Node.ELEMENT_NODE, (_node, delta) => {
          delta.ops.forEach((operation) => {
            if (typeof operation.insert !== "string") return;
            delete operation.attributes?.bold;
          });
          return delta;
        });
      }
      const clipboard = editor.getModule("clipboard") as Clipboard;
      if (valueRef.current) {
        const contents = clipboard.convert({
          html: valueRef.current,
          text: "",
        });
        if (kind === "chapter") {
          contents.ops.forEach((operation) => {
            if (typeof operation.insert === "string") {
              delete operation.attributes?.bold;
            }
          });
        }
        editor.setContents(contents, "silent");
      }
      editor.setSelection(null, "silent");
      editor.blur();
      const handleChange = () => {
        const html = editor.root.innerHTML;
        onChangeRef.current(html);
      };
      editor.on("text-change", handleChange);
      editorRef.current = editor;
      setEditorReady(true);
      requestAnimationFrame(() => {
        if (chapterPage) chapterPage.scrollTop = chapterPageScrollTop;
        window.scrollTo(windowScrollX, windowScrollY);
      });
      dispose = () => {
        editor.off("text-change", handleChange);
        editorRef.current = null;
        setEditorReady(false);
        container.replaceChildren();
      };
    }

    void initializeEditor();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [kind]);

  useEffect(() => {
    if (kind !== "chapter" || !editorReady) return;
    const editor = editorRef.current;
    if (!editor) return;

    const browserWindow = window as SearchHighlightWindow;
    const registry = browserWindow.CSS.highlights;
    const HighlightConstructor = browserWindow.Highlight;
    registry?.delete(SEARCH_HIGHLIGHT);
    registry?.delete(CURRENT_SEARCH_HIGHLIGHT);
    matchRangesRef.current = [];

    const term = searchTerm.trim();
    if (!term) {
      setMatchCount(0);
      setCurrentMatch(0);
      return;
    }

    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(escapedTerm, "gi");
    const ranges: Range[] = [];
    const walker = document.createTreeWalker(
      editor.root,
      NodeFilter.SHOW_TEXT,
    );
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent || "";
      matcher.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = matcher.exec(text))) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        ranges.push(range);
        if (!match[0].length) matcher.lastIndex++;
      }
    }

    matchRangesRef.current = ranges;
    setMatchCount(ranges.length);
    setCurrentMatch(0);
    if (ranges.length && registry && HighlightConstructor) {
      registry.set(SEARCH_HIGHLIGHT, new HighlightConstructor(...ranges));
      registry.set(
        CURRENT_SEARCH_HIGHLIGHT,
        new HighlightConstructor(ranges[0]),
      );
      ranges[0].startContainer.parentElement?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }

    return () => {
      registry?.delete(SEARCH_HIGHLIGHT);
      registry?.delete(CURRENT_SEARCH_HIGHLIGHT);
    };
  }, [editorReady, kind, searchTerm]);

  useEffect(() => {
    if (kind !== "chapter" || !editorReady) return;
    const registry = (window as SearchHighlightWindow).CSS.highlights;
    const HighlightConstructor = (window as SearchHighlightWindow).Highlight;
    registry?.delete(CURRENT_SEARCH_HIGHLIGHT);
    const range = matchRangesRef.current[currentMatch];
    if (!range || !registry || !HighlightConstructor) return;

    registry.set(
      CURRENT_SEARCH_HIGHLIGHT,
      new HighlightConstructor(range),
    );
    range.startContainer.parentElement?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [currentMatch, editorReady, kind]);

  function moveToMatch(offset: number) {
    if (!matchCount) return;
    setCurrentMatch((index) => (index + offset + matchCount) % matchCount);
  }

  return (
    <div className={`admin-rich-editor admin-rich-editor-${kind}`}>
      {kind === "chapter" && (
        <div className="admin-rich-search">
          <input
            type="search"
            aria-label="Search words in chapter"
            placeholder="Find in chapter..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                moveToMatch(event.shiftKey ? -1 : 1);
              }
            }}
          />
          <span aria-live="polite">
            {searchTerm.trim()
              ? matchCount
                ? `${currentMatch + 1} / ${matchCount}`
                : "No results"
              : ""}
          </span>
          <button
            type="button"
            aria-label="Previous match"
            disabled={!matchCount}
            onClick={() => moveToMatch(-1)}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Next match"
            disabled={!matchCount}
            onClick={() => moveToMatch(1)}
          >
            ↓
          </button>
        </div>
      )}
      {/* Quill injects toolbar as sibling of the mount node — keep mount inside wrapper */}
      <div ref={containerRef} />
    </div>
  );
}
