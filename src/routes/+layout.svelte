<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto, beforeNavigate, afterNavigate } from '$app/navigation';
	import NProgress from 'nprogress';
	import 'nprogress/nprogress.css';
	import {
		Menu,
		X,
		BookOpen,
		Search,
		Sun,
		Moon,
		Bookmark,
		User,
		Library,
		History,
		MessageSquare,
		DollarSign,
		Trash2,
		FileText,
		Shield
	} from 'lucide-svelte';
	import {
		getBookmarks,
		removeBookmark,
		type BookmarkEntry
	} from '$lib/stores/bookmark.svelte';
	import { getImpl } from '$lib/stores/impl';

	NProgress.configure({
		showSpinner: false,
		trickleSpeed: 100,
		minimum: 0.08,
		easing: 'ease',
		speed: 400
	});

	beforeNavigate(() => {
		NProgress.start();
	});

	afterNavigate(() => {
		NProgress.done();
	});

	let { children } = $props();

	let isReaderPage = $derived($page.url.pathname.startsWith('/read/'));
	let isSidebarOpen = $state(false);
	let isDesktop = $state(false);
	let isDarkMode = $state(true);
	let isBookmarkOpen = $state(false);
	let isAuthOpen = $state(false);
	let searchQuery = $state('');
	let isSearching = $state(false);
	let bookmarks = $state<BookmarkEntry[]>([]);

	const LOGO =
		'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhlpxqlAz__8_IHcJpy_JsiuX2dr0ompUWEoaUjtk279x167sNP1AphlLYw92AECMAcyXEg4bSnNcGnKZ86a3KEFGHwyi1huUIJ52zejDYkSeeTEnCL4Loig440EuS6yyeKZjmnAdkdcxsic5rArUT_bwv2Sk4lJgDXSYFSWLBawxBPBjGZPTS-pp2xTsc/s100/MIKOROKU.png';

	function homeHref(extra: Record<string, string> = {}): string {
		const source = (browser && getImpl()) || 'asura';
		const params = new URLSearchParams({ source, ...extra });
		return `/?${params.toString()}`;
	}

	function loadBookmarks() {
		bookmarks = getBookmarks();
	}

	function applyTheme(dark: boolean) {
		isDarkMode = dark;
		if (!browser) return;
		document.documentElement.classList.toggle('dark', dark);
		document.documentElement.classList.toggle('light', !dark);
		localStorage.setItem('darkMode', String(dark));
	}

	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
		if (browser && isDesktop) {
			localStorage.setItem('sidebarOpen', String(isSidebarOpen));
		}
	}

	function toggleDarkMode() {
		applyTheme(!isDarkMode);
	}

	function toggleBookmarkPanel() {
		isBookmarkOpen = !isBookmarkOpen;
		isAuthOpen = false;
		if (isBookmarkOpen) loadBookmarks();
	}

	function toggleAuth() {
		isAuthOpen = !isAuthOpen;
		isBookmarkOpen = false;
	}

	function closeOverlays() {
		if (!isDesktop) isSidebarOpen = false;
		isBookmarkOpen = false;
		isAuthOpen = false;
		isSearching = false;
	}

	function handleNavigate(e: MouseEvent, href: string) {
		e.preventDefault();
		closeOverlays();
		goto(href);
	}

	function goHome(e: MouseEvent) {
		e.preventDefault();
		closeOverlays();
		goto(homeHref());
	}

	function handleRemoveBookmark(mangaId: string) {
		removeBookmark(mangaId);
		loadBookmarks();
	}

	function handleSearchKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && searchQuery.trim()) {
			const targetUrl = homeHref({ q: searchQuery.trim() });
			closeOverlays();
			goto(targetUrl);
		}
	}

	function navClass() {
		return isDarkMode
			? 'hover:bg-zinc-900/80 hover:text-white'
			: 'hover:bg-black/5 hover:text-zinc-900';
	}

	function formatMangaHref(sourceId: string, mangaId: string): string {
		const cleanMangaId = mangaId.startsWith('/') ? mangaId : `/${mangaId}`;
		return `/manga/${sourceId}${cleanMangaId}`;
	}

	onMount(() => {
		const mq = window.matchMedia('(min-width: 1024px)');
		const applyMq = () => {
			isDesktop = mq.matches;
			if (isDesktop) {
				const saved = localStorage.getItem('sidebarOpen');
				isSidebarOpen = saved === null ? true : saved === 'true';
			} else {
				isSidebarOpen = false;
			}
		};
		applyMq();
		mq.addEventListener('change', applyMq);

		const savedTheme = localStorage.getItem('darkMode');
		applyTheme(savedTheme === null ? true : savedTheme === 'true');

		loadBookmarks();
		window.addEventListener('bookmarks-changed', loadBookmarks);

		const onDocClick = (e: MouseEvent) => {
			const t = e.target as HTMLElement;
			if (!t.closest('[data-dropdown]') && !t.closest('[data-dropdown-btn]')) {
				isBookmarkOpen = false;
				isAuthOpen = false;
				isSearching = false;
			}
		};
		document.addEventListener('click', onDocClick);

		return () => {
			mq.removeEventListener('change', applyMq);
			window.removeEventListener('bookmarks-changed', loadBookmarks);
			document.removeEventListener('click', onDocClick);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
	<script>
		(function () {
			try {
				var d = localStorage.getItem('darkMode');
				var dark = d === null ? true : d === 'true';
				document.documentElement.classList.toggle('dark', dark);
				document.documentElement.classList.toggle('light', !dark);
			} catch (e) {}
		})();
	</script>
</svelte:head>

<div
	class="theme-root min-h-screen font-[Inter,system-ui,sans-serif] {isDarkMode
		? 'bg-zinc-950 text-zinc-100'
		: 'bg-[#f5f5f7] text-zinc-900'}"
>
	{#if !isReaderPage}
		{#if isSidebarOpen && !isDesktop}
			<button
				onclick={closeOverlays}
				class="fixed inset-0 z-40 border-none bg-black/50 backdrop-blur-sm"
				aria-label="Close sidebar"
			></button>
		{/if}

		<aside
			class="fixed top-0 bottom-0 left-0 z-50 flex w-[260px] flex-col border-r transition-transform duration-300
				{isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
				{isDarkMode ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'}"
		>
			<div
				class="relative z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 {isDarkMode
					? 'border-zinc-800'
					: 'border-zinc-200'}"
			>
				<a href="/" onclick={goHome} class="flex min-w-0 items-center">
					<img src={LOGO} alt="Mikoroku" class="h-8 w-auto" />
				</a>
				<button
					onclick={toggleSidebar}
					class="shrink-0 rounded-lg p-1.5 transition {isDarkMode
						? 'text-zinc-400 hover:text-white'
						: 'text-zinc-500 hover:text-zinc-900'}"
					aria-label="Close sidebar"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<nav
				class="relative z-10 flex-1 space-y-0.5 overflow-y-auto p-3 text-sm {isDarkMode
					? 'text-zinc-400'
					: 'text-zinc-600'}"
			>
				<a
					href="/"
					onclick={goHome}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition {navClass()}"
				>
					<BookOpen class="h-5 w-5 shrink-0" /> Manga List
				</a>
				<a
					href="/"
					onclick={goHome}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition {navClass()}"
				>
					<BookOpen class="h-5 w-5 shrink-0" /> Hentai List
				</a>
				<a
					href="/"
					onclick={goHome}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition {navClass()}"
				>
					<Library class="h-5 w-5 shrink-0" /> Genre List
				</a>
				<a
					href="/bookmark"
					onclick={(e) => handleNavigate(e, '/bookmark')}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition {navClass()}"
				>
					<Bookmark class="h-5 w-5 shrink-0" /> Bookmark
				</a>
				<a
					href="/history"
					onclick={(e) => handleNavigate(e, '/history')}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition {navClass()}"
				>
					<History class="h-5 w-5 shrink-0" /> History
				</a>
				<a
					href="/"
					onclick={goHome}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition {navClass()}"
				>
					<FileText class="h-5 w-5 shrink-0" /> Commission
				</a>

				<div class="my-2 border-t {isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}"></div>

				<a
					href="https://discord.gg/kkt669knaG"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition {navClass()}"
				>
					<MessageSquare class="h-5 w-5 shrink-0" /> Discord
				</a>
				<a
					href="https://trakteer.id/mikorokuscan"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition {navClass()}"
				>
					<DollarSign class="h-5 w-5 shrink-0" /> Donation
				</a>
				<a
					href="/"
					onclick={goHome}
					class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition {navClass()}"
				>
					<Shield class="h-5 w-5 shrink-0" /> Admin Panel
				</a>
			</nav>
		</aside>
	{/if}

	<div
		class="flex min-h-screen flex-col transition-[margin] duration-300
			{!isReaderPage && isSidebarOpen && isDesktop ? 'lg:ml-[260px]' : 'ml-0'}"
	>
		{#if !isReaderPage}
			<header
				class="sticky top-0 z-30 w-full border-b backdrop-blur-xl {isDarkMode
					? 'border-zinc-800/50 bg-zinc-950/90'
					: 'border-zinc-200/80 bg-white/90'}"
			>
				<div class="flex h-14 w-full items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-5">
					<div class="flex shrink-0 items-center gap-2">
						{#if !isSidebarOpen}
							<button
								onclick={toggleSidebar}
								class="rounded-xl p-2 transition {isDarkMode
									? 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
									: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}"
								aria-label="Toggle menu"
							>
								<Menu class="h-6 w-6" />
							</button>
						{/if}

						{#if !isSidebarOpen || !isDesktop}
							<a href="/" onclick={goHome} class="flex items-center">
								<img src={LOGO} alt="Mikoroku" class="h-8 w-auto sm:h-9" />
							</a>
						{/if}
					</div>

					<div class="relative mx-1 hidden max-w-xl flex-1 md:block" data-dropdown>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search manga..."
							class="w-full rounded-full border py-2 pr-4 pl-10 text-sm focus:border-violet-500 focus:outline-none {isDarkMode
								? 'border-zinc-700/80 bg-zinc-900/80 text-zinc-200 placeholder-zinc-500'
								: 'border-zinc-300 bg-zinc-50 text-zinc-800 placeholder-zinc-400'}"
							onfocus={() => (isSearching = true)}
							onkeydown={handleSearchKey}
						/>
						<Search
							class="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-zinc-500"
						/>
					</div>

					<div class="relative flex shrink-0 items-center gap-0.5">
						<button
							onclick={toggleDarkMode}
							class="rounded-xl p-2.5 transition {isDarkMode
								? 'text-zinc-300 hover:bg-zinc-800/60 hover:text-amber-300'
								: 'text-zinc-600 hover:bg-zinc-100 hover:text-indigo-600'}"
							aria-label="Toggle theme"
						>
							{#if isDarkMode}
								<Sun class="h-6 w-6" />
							{:else}
								<Moon class="h-6 w-6" />
							{/if}
						</button>

						<div class="relative" data-dropdown>
							<button
								data-dropdown-btn
								onclick={toggleBookmarkPanel}
								class="relative rounded-xl p-2.5 transition {isDarkMode
									? 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
									: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}"
								aria-label="Bookmarks"
							>
								<Bookmark class="h-6 w-6" />
								{#if bookmarks.length > 0}
									<span
										class="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white"
									>
										{bookmarks.length > 99 ? '99+' : bookmarks.length}
									</span>
								{/if}
							</button>

							{#if isBookmarkOpen}
								<div
									class="absolute right-0 z-50 mt-2 max-h-[70vh] w-80 overflow-hidden rounded-xl border shadow-2xl {isDarkMode
										? 'border-zinc-800 bg-zinc-900'
										: 'border-zinc-200 bg-white'}"
								>
									<div
										class="flex items-center justify-between border-b px-4 py-3 {isDarkMode
											? 'border-zinc-800'
											: 'border-zinc-200'}"
									>
										<p class="text-sm font-semibold">Bookmarks</p>
										<span class="text-xs text-zinc-500">{bookmarks.length} item</span>
									</div>

									{#if bookmarks.length === 0}
										<p class="px-4 py-8 text-center text-xs text-zinc-500">Belum ada bookmark.</p>
									{:else}
										<div class="max-h-[50vh] overflow-y-auto p-2">
											{#each bookmarks as bm}
												{@const mangaHref = formatMangaHref(bm.sourceId, bm.mangaId)}
												<div
													class="group flex items-center gap-3 rounded-lg p-2 transition {isDarkMode
														? 'hover:bg-zinc-800'
														: 'hover:bg-zinc-100'}"
												>
													<a
														href={mangaHref}
														onclick={(e) => handleNavigate(e, mangaHref)}
														class="flex min-w-0 flex-1 items-center gap-3"
													>
														<div class="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800">
															{#if bm.cover}
																<img
																	src="/api/proxy?url={encodeURIComponent(bm.cover)}&source={bm.sourceId}&w=80&h=120"
																	alt={bm.mangaTitle}
																	class="h-full w-full object-cover"
																	loading="lazy"
																/>
															{/if}
														</div>
														<div class="min-w-0 flex-1">
															<p class="line-clamp-2 text-xs font-medium">{bm.mangaTitle}</p>
															<p class="mt-0.5 text-[10px] text-zinc-500 capitalize">
																{bm.sourceId}
															</p>
														</div>
													</a>
													<button
														onclick={() => handleRemoveBookmark(bm.mangaId)}
														class="shrink-0 rounded-md p-1.5 text-zinc-500 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
													>
														<Trash2 class="h-3.5 w-3.5" />
													</button>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						</div>

						<div class="relative" data-dropdown>
							<button
								data-dropdown-btn
								onclick={toggleAuth}
								class="rounded-full p-1 transition hover:opacity-90"
								aria-label="Account"
							>
								<span
									class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white ring-2 ring-white/10"
								>
									M
								</span>
							</button>

							{#if isAuthOpen}
								<div
									class="absolute right-0 z-50 mt-2 w-56 rounded-xl border py-2 shadow-xl {isDarkMode
										? 'border-zinc-800 bg-zinc-900'
										: 'border-zinc-200 bg-white'}"
								>
									<div
										class="border-b px-4 py-2 {isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}"
									>
										<p class="text-sm font-semibold">Guest</p>
										<p class="text-xs text-zinc-500">Silakan login terlebih dahulu</p>
									</div>
									<div class="p-2">
										<button
											class="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition {isDarkMode
												? 'text-zinc-300 hover:bg-zinc-800'
												: 'text-zinc-700 hover:bg-zinc-100'}"
										>
											<User class="h-4 w-4" /> Login via Email
										</button>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</header>
		{/if}

		<main class="flex-1">
			<div class="min-h-full" onclick={closeOverlays} role="presentation">
				{@render children()}
			</div>
		</main>

		{#if !isReaderPage}
			<footer
				class="border-t py-5 text-center text-xs {isDarkMode
					? 'border-zinc-800/50 text-zinc-500'
					: 'border-zinc-200 text-zinc-500'}"
			>
				Mikoroku - Manga Reader
			</footer>
		{/if}
	</div>
</div>