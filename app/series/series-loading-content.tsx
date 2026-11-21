"use client";

import type { CSSProperties } from "react";

export default function SeriesLoadingContent() {
  const detailLayoutStyle = {
    "--detail-gutter": "32px",
    "--detail-max-width": "1250px",
  } as CSSProperties;

  return (
    <main
      className="detail-route route-page-background relative isolate z-[2] min-h-screen bg-transparent text-[#050000] dark:text-white"
      style={detailLayoutStyle}
      aria-busy="true"
      aria-label="Memuat detail manga"
    >
      <div className="container relative z-[2] mx-auto my-0 min-h-screen w-full max-w-[480px] text-[#171717] transition-[margin-left,width,max-width,color] duration-300 dark:text-white md:my-5 md:max-w-[720px] md:rounded-[20px] md:bg-black/[0.04] md:shadow-lg md:dark:bg-[#171717]/75 lg:my-[30px] lg:ml-[var(--detail-content-left)] lg:mr-0 lg:max-w-[var(--detail-max-width)] lg:w-[var(--detail-content-width)] lg:rounded-3xl">
        <div className="content relative z-[3] md:grid md:grid-cols-[200px_minmax(0,1fr)] md:gap-x-[30px] md:px-[30px] md:pt-[35px] lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-x-10 lg:px-10 lg:pt-10">
          <div className="main flex items-start gap-[14px] p-[18px_14px_14px] md:contents">
            <div className="left-column flex w-[95px] shrink-0 flex-col items-center gap-3 md:col-start-1 md:row-start-1 md:row-span-7 md:w-[200px] md:self-start md:pt-0 lg:w-[240px]">
              <div className="cover h-[130px] w-[90px] animate-pulse overflow-hidden rounded-xl bg-white/10 md:h-[280px] md:w-[200px] lg:h-[340px] lg:w-[240px]" />
              <div className="rating flex w-full items-center justify-center gap-1">
                <div className="h-2.5 w-14 animate-pulse rounded bg-white/10" />
                <div className="h-2.5 w-5 animate-pulse rounded bg-white/10" />
              </div>
              <div className="flex w-full flex-col gap-2">
                <div className="h-5 w-full animate-pulse rounded-md bg-white/10" />
                <div className="h-5 w-full animate-pulse rounded-md bg-white/10" />
                <div className="h-5 w-full animate-pulse rounded-md bg-white/10" />
              </div>
            </div>

            <div className="info min-w-0 flex-1 md:col-start-2 md:row-start-1">
              <div className="mb-[6px] h-3 w-14 animate-pulse rounded bg-white/10" />
              <div className="mb-1.5 h-[18px] w-4/5 animate-pulse rounded bg-white/15" />
              <div className="mb-1.5 h-px w-full bg-white/15" />
              <div className="mb-2 h-3 w-3/4 animate-pulse rounded bg-white/10" />

              <div className="space-y-[5px]">
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={index} className="flex h-[14px] items-center gap-1">
                    <div className="h-2.5 w-3 shrink-0 animate-pulse rounded bg-white/10" />
                    <div className="h-2.5 w-12 animate-pulse rounded bg-white/10" />
                    <div
                      className={`h-2.5 animate-pulse rounded bg-white/10 ${
                        index % 2 ? "w-2/5" : "w-1/2"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="genres grid grid-cols-4 gap-2 rounded-[14px] px-[14px] py-[15px] md:col-start-2 md:mx-0 md:w-auto md:grid-cols-[repeat(auto-fit,minmax(110px,1fr))] md:gap-[10px] md:px-0 md:py-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-[27px] animate-pulse rounded-lg bg-white/10"
              />
            ))}
          </div>

          <nav
            className="detail-tabs mx-3 flex w-[calc(100%-24px)] items-center justify-between gap-2 py-2 md:col-start-2 md:mx-0 md:mb-4 md:w-auto md:justify-start md:gap-4"
            aria-hidden="true"
          >
            <div className="h-4 w-20 animate-pulse rounded bg-white/15" />
            <div className="h-4 w-14 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-14 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
          </nav>

          <div className="chapter-search mx-3 mb-3 h-10 animate-pulse rounded-lg bg-white/10 md:col-start-2 md:mx-0" />

          <div className="mb-3 flex items-center justify-between px-3 md:col-start-2 md:px-0">
            <div className="flex gap-2">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="h-8 w-8 animate-pulse rounded-lg bg-white/10"
                />
              ))}
            </div>
            <div className="flex gap-1">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
            </div>
          </div>

          <div className="section-title my-2 mb-3 flex min-h-[50px] items-center justify-center gap-2 px-3 md:col-start-2 md:px-0">
            <div className="h-px flex-1 bg-white/15" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="h-px flex-1 bg-white/15" />
          </div>

          <div className="chapter-grid grid grid-cols-4 gap-2 px-4 pb-[30px] md:col-start-2 md:grid-cols-6 md:gap-[10px] md:px-0 md:pb-10 lg:grid-cols-8 lg:pb-[50px]">
            {Array.from({ length: 12 }, (_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse rounded-md bg-white/10"
              />
            ))}
          </div>
        </div>
      </div>

      <aside
        className="pointer-events-none fixed hidden w-[220px] animate-pulse lg:block"
        style={{
          left:
            "calc(var(--detail-content-left) + var(--detail-content-width) + var(--detail-rec-gap))",
          top: 30,
        }}
        aria-hidden="true"
      >
        <div className="mb-3 h-8 rounded-lg bg-black/10 dark:bg-white/[0.08]" />
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="mb-2 flex h-[72px] items-center gap-2 rounded-lg border border-white/10 bg-black/10 p-2 dark:bg-black/25"
          >
            <div className="h-[56px] w-[42px] shrink-0 rounded-md bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-full rounded bg-white/10" />
              <div className="h-2.5 w-3/4 rounded bg-white/10" />
            </div>
          </div>
        ))}
      </aside>
    </main>
  );
}