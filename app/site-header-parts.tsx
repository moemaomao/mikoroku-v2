import type { ReactNode } from "react";

export function Icon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  switch (name) {
    case "close": return <svg {...common}><path d="m18 6-12 12M6 6l12 12" /></svg>;
    case "book": return <svg {...common}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 0 0-5H20" /></svg>;
    case "grid": return <svg {...common}><path d="M7 7h10v10H7zM7 3v4m10-4v4M7 17v4m10-4v4" /></svg>;
    case "bookmark": return <svg {...common}><path d="M6 4h12v18l-6-4-6 4V4z" /></svg>;
    case "history": return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6M12 7v5l3 2" /></svg>;
    case "commission": return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6m-4 5H8m8 4H8" /></svg>;
    case "trophy": return <svg {...common}><path d="M8 3h8v4a4 4 0 0 1-8 0V3Zm4 8v5m-4 5h8M5 5H3v2a4 4 0 0 0 4 4m12-6h2v2a4 4 0 0 1-4 4" /></svg>;
    case "discord": return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case "donation": return <svg {...common}><path d="M12 2v20m5-17H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
    case "shield": return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case "bell": return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
    case "megaphone": return <svg {...common}><path d="M3 11v3a1 1 0 0 0 1 1h3l11 4V5L7 10H4a1 1 0 0 0-1 1Z" /><path d="m7 15 2 6h4l-2-5" /><path d="m21 9 2-1m-2 4h2m-2 4 2 1" /></svg>;
    case "user": return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" /></svg>;
    case "message": return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case "settings": return <svg {...common}><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>;
    case "logout": return <svg {...common}><path d="m10 17 5-5-5-5m5 5H3m18 7V5a2 2 0 0 0-2-2h-6" /></svg>;
    case "sun": return <svg {...common}><circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
    case "search": return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

export function SidebarLink({ href, icon, children, onClick, external = false }: {
  href: string;
  icon: string;
  children: ReactNode;
  onClick?: () => void;
  external?: boolean;
}) {
  const className = "flex w-full items-center gap-3 rounded-xl border border-transparent px-3.5 py-3 text-sm font-medium text-slate-900 no-underline transition hover:bg-white/75 hover:text-black dark:text-indigo-50/90 dark:hover:bg-white/10 dark:hover:text-white";
  const content = <><Icon name={icon} className="h-5 w-5 shrink-0" />{children}</>;
  return external
    ? <a className={className} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>{content}</a>
    : <a className={className} href={href} onClick={onClick}>{content}</a>;
}

export function SiteSidebar({
  open,
  mobile,
  canAccessAdminPanels,
  logoUrl,
  onClose,
}: {
  open: boolean;
  mobile: boolean;
  canAccessAdminPanels: boolean;
  logoUrl: string;
  onClose: () => void;
}) {
  const closeOnMobile = () => { if (mobile) onClose(); };
  return (
    <>
      <button type="button" tabIndex={mobile && open ? 0 : -1} aria-label="Close navigation menu" aria-hidden={!(mobile && open)} onClick={onClose} className={`fixed inset-0 z-[10000] bg-slate-900/35 transition-opacity duration-200 min-[769px]:hidden ${mobile && open ? "visible opacity-100" : "pointer-events-none invisible opacity-0"}`} />
      <aside id="siteSidebar" aria-hidden={!open} inert={!open} aria-label="Navigation menu" className={`fixed left-0 top-0 z-[10001] flex h-dvh w-[var(--sidebar-width)] max-w-[85vw] flex-col overflow-y-auto border-r border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.98)_100%),url('https://i.ibb.co/DgLF7wgr/5da90ce5b424.jpg')] bg-cover bg-center p-[18px_14px] text-indigo-950 transition-transform duration-300 ease-in-out dark:border-white/15 dark:bg-[linear-gradient(180deg,rgba(11,16,32,0.637)_0%,rgba(11,16,32,0.88)_100%),url('https://i.ibb.co/DgLF7wgr/5da90ce5b424.jpg')] dark:text-indigo-50 min-[769px]:max-w-[var(--sidebar-width)] min-[769px]:transition-none ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-2 flex items-center justify-between gap-3 px-1.5 pb-[18px] pt-1">
          <a href="/" aria-label="Mikoroku home" onClick={closeOnMobile} className="flex h-[42px] shrink-0 items-center"><img src={logoUrl} alt="Mikoroku" className="h-full w-auto object-contain" /></a>
          <button type="button" id="sidebarClose" aria-label="Close menu" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-black/[0.04] text-slate-800 transition hover:border-[var(--mikoroku-accent)]/40 hover:bg-[var(--mikoroku-accent-soft)] hover:text-[var(--mikoroku-accent)] dark:border-white/15 dark:bg-white/[0.06] dark:text-indigo-50 dark:hover:text-[var(--mikoroku-accent)]"><Icon name="close" className="h-[22px] w-[22px]" /></button>
        </div>
        <nav className="flex flex-col gap-1">
          <SidebarLink href="/manga-list" icon="book" onClick={closeOnMobile}>Manga List</SidebarLink>
          <SidebarLink href="/hentai-list" icon="book" onClick={closeOnMobile}>Hentai List</SidebarLink>
          <SidebarLink href="/genre-list" icon="grid" onClick={closeOnMobile}>Genre List</SidebarLink>
          <SidebarLink href="/bookmark" icon="bookmark" onClick={closeOnMobile}>Bookmark</SidebarLink>
          <SidebarLink href="/history" icon="history" onClick={closeOnMobile}>History</SidebarLink>
          <SidebarLink href="/commission" icon="commission" onClick={closeOnMobile}>Commission</SidebarLink>
          <SidebarLink href="/leaderboard" icon="trophy" onClick={closeOnMobile}>Top Comments</SidebarLink>
          <SidebarLink href="/global-settings" icon="settings" onClick={closeOnMobile}>Global Settings</SidebarLink>
          <div className="my-3 h-px bg-gradient-to-r from-transparent via-black/15 to-transparent dark:via-white/15" />
          <SidebarLink href="https://discord.gg/kkt669knaG" icon="discord" external>Discord</SidebarLink>
          <SidebarLink href="https://trakteer.id/mikorokuscan" icon="donation" external>Donation</SidebarLink>
          {canAccessAdminPanels && <><SidebarLink href="/admin" icon="shield" onClick={closeOnMobile}>Admin Panel</SidebarLink><SidebarLink href="/admin/moderation" icon="shield" onClick={closeOnMobile}>Moderator Panel</SidebarLink></>}
        </nav>
      </aside>
    </>
  );
}
