export const sectionTitleClass =
  "my-0 flex min-h-[50px] w-full items-center justify-center text-[15px] leading-5 before:h-px before:flex-1 before:bg-[#aaa] before:content-[''] after:h-px after:flex-1 after:bg-[#aaa] after:content-[''] [&>span]:whitespace-nowrap [&>span]:rounded-[15px] [&>span]:border [&>span]:border-[#aaa] [&>span]:px-[10px] [&>span]:py-1";

export const loadMoreClass =
  "mx-auto my-5 block cursor-pointer rounded-[20px] border-0 bg-[#8b0000] px-5 py-2 text-[13px] font-semibold text-white transition-[opacity,background,transform] duration-200 hover:bg-[#a0152a] hover:opacity-95 active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-[#555] disabled:opacity-45";

export const catalogGridClass =
  "grid w-full min-w-0 grid-cols-3 gap-3 p-[15px] min-[640px]:grid-cols-4 min-[900px]:grid-cols-5 min-[1100px]:grid-cols-6 min-[1300px]:grid-cols-7 min-[1500px]:mx-auto min-[1500px]:max-w-[1280px] min-[1500px]:grid-cols-8 min-[769px]:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] max-[600px]:gap-1 max-[600px]:p-0 list-mode:!grid-cols-1 list-mode:!gap-1 list-mode:!p-1 min-[769px]:list-mode:!grid-cols-4 min-[769px]:list-mode:!gap-2 min-[769px]:list-mode:!p-2";

export const cardClass =
  "card group/card relative block w-full overflow-hidden rounded-[10px] bg-white dark:bg-[#1f1f1f] animate-fade-in-up";

export const skeletonListCardClass =
  "list-mode:!flex list-mode:!flex-row list-mode:!items-stretch list-mode:!gap-0 list-mode:!overflow-hidden list-mode:!rounded-xl list-mode:!border list-mode:!border-black/10 list-mode:!p-0 dark:list-mode:!border-white/10";

export const skeletonListCoverClass =
  "list-mode:!h-[72px] list-mode:!w-[72px] list-mode:!min-w-[72px] list-mode:!max-w-[72px] list-mode:!shrink-0 list-mode:!aspect-square list-mode:!rounded-[8px] md:list-mode:!h-[96px] md:list-mode:!w-[96px] md:list-mode:!min-w-[96px] md:list-mode:!max-w-[96px] md:list-mode:!aspect-square";

export const skeletonListContentClass =
  "list-mode:!flex md:list-mode:!gap-3 md:list-mode:!p-4";

export const cardCoverClass =
  "thumb relative aspect-[2/3] w-full overflow-hidden rounded-[10px] bg-[#f0f0f0] dark:bg-[#111]";

export const cardImageClass = "block h-full w-full object-cover";

export const cardOverlayClass =
  "overlay pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.88),transparent)] p-2 pb-7";

export const cardTitleClass =
  "title relative z-10 m-0 line-clamp-2 overflow-hidden text-center text-[13px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.7)] transition-all duration-200 [@media(hover:hover)]:group-hover/card:absolute [@media(hover:hover)]:group-hover/card:inset-x-1.5 [@media(hover:hover)]:group-hover/card:bottom-7 [@media(hover:hover)]:group-hover/card:line-clamp-none [@media(hover:hover)]:group-hover/card:overflow-visible [@media(hover:hover)]:group-hover/card:rounded-lg [@media(hover:hover)]:group-hover/card:bg-black/30 [@media(hover:hover)]:group-hover/card:px-2.5 [@media(hover:hover)]:group-hover/card:py-2 [@media(hover:hover)]:group-hover/card:shadow-[0_6px_18px_rgba(0,0,0,0.45)]";

export const bottomBadgeBarClass =
  "badge-bar absolute inset-x-0 bottom-0 z-20 flex h-[22px] items-stretch overflow-hidden rounded-b-[10px]";

export const typeBadgeClass =
  "type-badge flex min-w-0 flex-1 items-center justify-start truncate px-1.5 text-[8px] font-bold uppercase leading-none";

export const statusBadgeClass =
  "status-badge flex min-w-0 flex-1 items-center justify-end truncate px-1.5 text-[8px] font-bold uppercase leading-none";

export const chapterBadgeClass =
  "ch-badge absolute left-1.5 top-1 z-20 rounded-[4px] bg-[#ffcc00] px-1.5 py-0.5 text-[8px] font-bold text-black";

export const upBadgeClass =
  "up-badge absolute right-1.5 top-1 z-20 animate-pulse rounded-[4px] bg-red-600 px-1.5 py-0.5 text-[8px] font-bold text-white";

export const typeBadgeColors: Record<string, string> = {
  manga: "bg-[linear-gradient(to_left,transparent_0%,transparent_25%,rgba(201,23,20,0.45)_70%)] text-[#ff8a80]",
  manhwa: "bg-[linear-gradient(to_left,transparent_0%,transparent_25%,rgba(25,118,210,0.45)_70%)] text-[#82b1ff]",
  manhua: "bg-[linear-gradient(to_left,transparent_0%,transparent_25%,rgba(46,125,50,0.45)_70%)] text-[#a5d6a7]",
  novel: "bg-[linear-gradient(to_left,transparent_0%,transparent_25%,rgba(142,36,170,0.45)_70%)] text-[#e1bee7]",
  "light-novel": "bg-[linear-gradient(to_left,transparent_0%,transparent_25%,rgba(14,0,138,0.50)_70%)] text-[#b39ddb]",
  "web-novel": "bg-[linear-gradient(to_left,transparent_0%,transparent_25%,rgba(165,1,124,0.45)_70%)] text-[#f48fb1]",
  doujinshi: "bg-[linear-gradient(to_left,transparent_0%,transparent_25%,rgba(139,30,66,0.45)_70%)] text-[#ef9a9a]",
  webtoon: "bg-[linear-gradient(to_left,transparent_0%,transparent_25%,rgba(0,200,83,0.40)_70%)] text-[#69f0ae]",
  cg: "bg-[linear-gradient(to_left,transparent_0%,transparent_25%,rgba(0,150,136,0.45)_70%)] text-[#80cbc4]",
  default: "bg-[linear-gradient(to_left,transparent_0%,transparent_25%,rgba(255,255,255,0.20)_70%)] text-[#eeeeee]",
};

export const statusBadgeColors: Record<string, string> = {
  ongoing: "bg-[linear-gradient(to_right,transparent_0%,transparent_25%,rgba(21,128,61,0.45)_70%)] text-[#69f0ae]",
  completed: "bg-[linear-gradient(to_right,transparent_0%,transparent_25%,rgba(41,98,255,0.45)_70%)] text-[#82b1ff]",
  hiatus: "bg-[linear-gradient(to_right,transparent_0%,transparent_25%,rgba(255,145,0,0.45)_70%)] text-[#ffd180]",
  dropped: "bg-[linear-gradient(to_right,transparent_0%,transparent_25%,rgba(209,17,56,0.45)_70%)] text-[#ff8a80]",
  canceled: "bg-[linear-gradient(to_right,transparent_0%,transparent_25%,rgba(109,76,65,0.50)_70%)] text-[#bcaaa4]",
};

export const homepageSectionHeadingClass =
  `${sectionTitleClass} before:!bg-[var(--mikoroku-home-section-accent)] after:!bg-[var(--mikoroku-home-section-accent)] [&>span]:!border-[var(--mikoroku-home-section-accent)] [&>span]:!text-[var(--mikoroku-home-section-text)]`;

export const homepageLoadMoreClass =
  `${loadMoreClass} !bg-[var(--mikoroku-home-load-more)] hover:!bg-[var(--mikoroku-home-load-more-hover)] focus-visible:!outline-[var(--mikoroku-home-load-more)]`;
