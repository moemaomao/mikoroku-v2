"use client";

import { useState } from "react";

const servers = [
  {
    name: "Server 1",
    description: "Server utama untuk membaca chapter. (Rekomendasi)",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    name: "Server 2",
    description: "Server alternatif jika chapter di Server 1 mengalami masalah atau tidak dapat dimuat.",
    color: "text-amber-600 dark:text-amber-400",
  },
  {
    name: "Emergency Server",
    description: "Server cadangan. Sebagian chapter belum lengkap. Jika gambar tidak muncul, artinya server sedang terkena limit dan gambar tidak dapat dimuat sementara. (Busuk)",
    color: "text-red-600 dark:text-red-400",
  },
] as const;

function ServerIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="6" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="8" cy="7" r="1" fill="currentColor" />
      <circle cx="8" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

export default function ReaderServerNotice() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <section
      aria-label="Informasi server chapter"
      className="mx-3 my-4 mb-[15px] w-[calc(100%-24px)] overflow-hidden rounded-[14px] border border-black/10 bg-[rgba(184,174,174,0.329)] px-[14px] py-[15px] text-[13px] text-[#050000] shadow-sm backdrop-blur-lg md:mx-[30px] md:my-3 md:mb-[30px] md:w-[calc(100%-60px)] lg:mx-10 lg:my-0 lg:mb-10 lg:w-[calc(100%-80px)] dark:border-white/[0.08] dark:bg-[rgba(26,26,46,0.35)] dark:text-white"
    >
      <div className="mb-[14px] flex items-center justify-between">
        <h2 className="m-0 p-0 text-lg font-bold leading-tight text-amber-700 dark:text-[#ffd700]">
          PERHATIAN
        </h2>
        <button
          type="button"
          aria-label="Tutup pengumuman"
          onClick={() => setVisible(false)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-transparent text-[22px] font-light leading-none text-[#555] transition hover:bg-black/[0.06] hover:text-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:text-[#ddd] dark:hover:bg-white/10 dark:hover:text-red-400"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-[14px]">
        {servers.map((server) => (
          <div key={server.name}>
            <h3 className={`mb-1 flex items-center gap-2 text-[13px] font-bold leading-[1.3] ${server.color}`}>
              <ServerIcon />
              {server.name}
            </h3>
            <p className="m-0 pl-6 text-[13px] font-normal leading-[1.5] text-[#333] dark:text-[#ddd]">
              {server.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
