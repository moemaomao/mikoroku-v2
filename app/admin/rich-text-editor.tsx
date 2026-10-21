"use client";

import type Quill from "quill";
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
  const editorRef = useRef<Quill | null>(null);
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

      const editor = new QuillConstructor(container, {
        theme: "snow",
        placeholder:
          kind === "description"
            ? "Write manga description..."
            : "Novel chapter content (optional)...",
        modules: { toolbar: toolbars[kind] },
      });
      if (valueRef.current) editor.root.innerHTML = valueRef.current;
      const handleChange = () => onChangeRef.current(editor.root.innerHTML);
      editor.on("text-change", handleChange);
      editorRef.current = editor;
      dispose = () => {
        editor.off("text-change", handleChange);
        editorRef.current = null;
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
    const editor = editorRef.current;
    if (!editor || editor.root.innerHTML === value) return;
    const selection = editor.getSelection();
    editor.root.innerHTML = value;
    if (selection) {
      editor.setSelection(
        Math.min(selection.index, editor.getLength() - 1),
        selection.length,
        "silent",
      );
    }
  }, [value]);

  return (
    <div
      className={`admin-rich-editor admin-rich-editor-${kind}`}
      ref={containerRef}
    />
  );
}
