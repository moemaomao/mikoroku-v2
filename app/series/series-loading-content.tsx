"use client";

export default function SeriesLoadingContent() {
  return (
    <main
      className="route-page-background min-h-[calc(100vh-56px)]"
      aria-busy="true"
      aria-label="Memuat detail manga"
    >
      <div className="mx-auto max-w-[1200px] px-4 py-6 md:py-8">
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          <div className="mx-auto w-[180px] shrink-0 md:mx-0 md:w-[220px]">
            <div className="aspect-[2/3] w-full animate-pulse rounded-lg bg-white/10" />
            <div className="mt-3 h-9 w-full animate-pulse rounded-md bg-white/10" />
            <div className="mt-2 h-9 w-full animate-pulse rounded-md bg-white/10" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 h-4 w-24 animate-pulse rounded bg-white/10" />
            <div className="mb-3 h-8 w-3/4 max-w-md animate-pulse rounded bg-white/15" />
            <div className="mb-4 h-4 w-1/2 max-w-sm animate-pulse rounded bg-white/10" />

            <div className="mb-5 flex flex-wrap gap-2">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="h-7 w-16 animate-pulse rounded-full bg-white/10" />
              ))}
            </div>

            <div className="mb-4 flex gap-4 border-b border-white/10 pb-2">
              <div className="h-5 w-20 animate-pulse rounded bg-white/15" />
              <div className="h-5 w-16 animate-pulse rounded bg-white/10" />
              <div className="h-5 w-16 animate-pulse rounded bg-white/10" />
            </div>

            <div className="mb-3 h-10 w-full animate-pulse rounded-lg bg-white/10" />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="h-11 animate-pulse rounded-md bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
