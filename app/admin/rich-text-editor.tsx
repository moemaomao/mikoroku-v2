"use client";

import type Clipboard from "quill/modules/clipboard";
import { useEffect, useRef } from "react";

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
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

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
      requestAnimationFrame(() => {
        if (chapterPage) chapterPage.scrollTop = chapterPageScrollTop;
        window.scrollTo(windowScrollX, windowScrollY);
      });
      dispose = () => {
        editor.off("text-change", handleChange);
        container.replaceChildren();
      };
    }

    void initializeEditor();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [kind]);

  return (
    <div className={`admin-rich-editor admin-rich-editor-${kind}`}>
      {/* Quill injects toolbar as sibling of the mount node — keep mount inside wrapper */}
      <div ref={containerRef} />
    </div>
  );
}
