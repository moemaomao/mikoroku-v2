"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { initializeFirebaseClient } from "../lib/firebase-client";
import {
  DEFAULT_READER_SERVER_NOTICE,
  normalizeReaderServerNoticeConfig,
} from "./reader-server-notice-config";

function noticeDocument(code: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      html, body { box-sizing: border-box; width: 100%; margin: 0; padding: 0; }
      *, *::before, *::after { box-sizing: inherit; }
      body { overflow-wrap: anywhere; }
    </style>
  </head>
  <body>
    ${code}
    <script>
      (() => {
        const reportHeight = () => parent.postMessage({
          type: "mikoroku-reader-server-notice",
          height: document.documentElement.scrollHeight
        }, "*");
        new ResizeObserver(reportHeight).observe(document.documentElement);
        addEventListener("load", reportHeight);
        setTimeout(reportHeight, 0);
      })();
    </script>
  </body>
</html>`;
}

export default function ReaderServerNotice() {
  const [visible, setVisible] = useState(true);
  const [config, setConfig] = useState(DEFAULT_READER_SERVER_NOTICE);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [frameHeight, setFrameHeight] = useState(160);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let active = true;
    async function loadConfig() {
      try {
        const { firestore } = initializeFirebaseClient();
        const snapshot = await getDoc(doc(firestore, "meta", "mangaSummary"));
        if (!active) return;
        const settings = snapshot.exists() ? snapshot.data().readerServerNotice : null;
        if (settings) {
          setConfig(normalizeReaderServerNoticeConfig(settings));
        }
        setConfigLoaded(true);
      } catch (error) {
        console.error("Reader server notice settings could not be loaded.", error);
      }
    }
    void loadConfig();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleFrameMessage(event: MessageEvent<unknown>) {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (!event.data || typeof event.data !== "object") return;
      const message = event.data as { type?: unknown; height?: unknown };
      if (message.type !== "mikoroku-reader-server-notice" || typeof message.height !== "number") return;
      setFrameHeight(Math.max(80, Math.min(1200, Math.ceil(message.height))));
    }
    window.addEventListener("message", handleFrameMessage);
    return () => window.removeEventListener("message", handleFrameMessage);
  }, []);

  if (!configLoaded || !visible || !config.enabled) return null;

  return (
    <section
      aria-label="Informasi server chapter"
      className="mx-3 my-4 mb-[15px] w-[calc(100%-24px)] overflow-hidden rounded-[14px] border border-black/10 bg-[rgba(184,174,174,0.329)] p-2 shadow-sm backdrop-blur-lg md:mx-[30px] md:my-3 md:mb-[30px] md:w-[calc(100%-60px)] lg:mx-10 lg:my-0 lg:mb-10 lg:w-[calc(100%-80px)] dark:border-white/[0.08] dark:bg-[rgba(26,26,46,0.35)]"
    >
      <div className="relative">
        <iframe
          ref={frameRef}
          title="Informasi server chapter"
          srcDoc={noticeDocument(config.code)}
          sandbox="allow-scripts allow-forms allow-popups"
          referrerPolicy="no-referrer"
          className="block w-full border-0"
          style={{ height: frameHeight }}
        />
        <button
          type="button"
          aria-label="Tutup pengumuman"
          onClick={() => setVisible(false)}
          className="absolute right-1 top-1 z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-[22px] font-light leading-none text-[#555] transition hover:bg-black/[0.06] hover:text-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:bg-black/50 dark:text-[#ddd] dark:hover:bg-white/10 dark:hover:text-red-400"
        >
          ×
        </button>
      </div>
    </section>
  );
}
