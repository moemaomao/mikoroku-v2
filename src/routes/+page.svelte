<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { ChevronLeft, ChevronRight, Loader2, ArrowRight } from 'lucide-svelte';
	import BrowseHeader from '$lib/components/BrowseHeader.svelte';

	const { data }: { data: PageData } = $props();
	let { mangas, sources, currentSource, currentPage, searchQuery } = $derived(data);

	let loading = $state(false);
	let isDarkMode = $state(true);

	// State untuk input "Jump to Page"
	let jumpPageInput = $state('');

	// Membaca state awal filter dari search params URL
	let selectedLang = $state($page.url.searchParams.get('lang') || 'all');
	let selectedType = $state($page.url.searchParams.get('type') || 'all');

	// Menyelaraskan filter & input halaman saat URL/currentPage berubah
	$effect(() => {
		selectedLang = $page.url.searchParams.get('lang') || 'all';
		selectedType = $page.url.searchParams.get('type') || 'all';
		jumpPageInput = '';
		loading = false;
	});

	function updateThemeState() {
		if (typeof document !== 'undefined') {
			isDarkMode = document.documentElement.classList.contains('dark');
		}
	}

	onMount(() => {
		updateThemeState();
		const observer = new MutationObserver(updateThemeState);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	});

	function proxyImage(url: string): string {
		if (!url) return '';
		let u = String(url).trim();
		if (u.startsWith('//')) u = 'https:' + u;
		return `/api/proxy?url=${encodeURIComponent(u)}&source=${currentSource}&w=120&h=180`;
	}

	function onCoverError(e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		const original = img.dataset.original;
		if (!original) return;
		if (img.dataset.fallback === '1') {
			img.style.opacity = '0';
			return;
		}
		img.dataset.fallback = '1';
		img.src = `/api/proxy?url=${encodeURIComponent(original)}&source=${currentSource}`;
	}

	async function navigate(params: URLSearchParams) {
		loading = true;
		try {
			await goto(`/?${params.toString()}`, {
				invalidateAll: true,
				keepFocus: true,
				noScroll: false
			});
		} finally {
			loading = false;
		}
	}

	function goToPage(p: number) {
		if (p < 1 || p === currentPage || loading) return;
		const params = new URLSearchParams();
		params.set('source', currentSource);
		params.set('page', String(p));
		if (searchQuery) params.set('q', searchQuery);
		if (selectedLang !== 'all') params.set('lang', selectedLang);
		if (selectedType !== 'all') params.set('type', selectedType);
		navigate(params);
	}

	function handleJumpPage(e: SubmitEvent) {
		e.preventDefault();
		const targetPage = parseInt(jumpPageInput, 10);
		if (!isNaN(targetPage) && targetPage > 0) {
			goToPage(targetPage);
		}
	}

	// Helper Generasi Nomor Halaman
	function getPaginationRange(current: number) {
		const delta = 2;
		const range: (number | string)[] = [];
		const rangeWithDots: (number | string)[] = [];

		for (let i = Math.max(1, current - delta); i <= current + delta; i++) {
			range.push(i);
		}

		if (typeof range[0] === 'number' && range[0] > 1) {
			if (range[0] === 2) {
				rangeWithDots.push(1);
			} else {
				rangeWithDots.push(1, '...');
			}
		}

		for (let i of range) {
			rangeWithDots.push(i);
		}

		rangeWithDots.push('...');
		return rangeWithDots;
	}

	function statusClass(status?: string) {
		const s = (status || '').toLowerCase();
		if (s.includes('ongoing')) return 'bg-green-600';
		if (s.includes('completed') || s.includes('complete')) return 'bg-blue-600';
		if (s.includes('hiatus')) return 'bg-orange-500';
		if (s.includes('dropped')) return 'bg-red-700';
		return 'bg-green-600';
	}

	function typeBadgeClass(type?: string) {
		const t = (type || 'manga').toLowerCase();
		switch (t) {
			case 'doujinshi':
				return 'bg-[#8b1e42]';
			case 'artistcg':
			case 'gamecg':
				return 'bg-[#009688]';
			case 'imageset':
				return 'bg-[#616161]';
			case 'anime':
				return 'bg-[#7b1fa2]';
			case 'western':
				return 'bg-[#5d4037]';
			case 'non-h':
				return 'bg-[#455a64]';
			case 'manhwa':
				return 'bg-[#1976D2]';
			case 'manhua':
				return 'bg-[#2E7D32]';
			default:
				return 'bg-[#c91714]';
		}
	}
</script>

<svelte:head>
	<title>Mikoroku - Browse Manga</title>
</svelte:head>

<div class="mx-auto w-full max-w-none px-2 py-3 sm:px-3 sm:py-4 lg:px-4">
	<!-- HEADER / FILTER -->
	<BrowseHeader
		{sources}
		{currentSource}
		{searchQuery}
		bind:loading
		bind:selectedLang
		bind:selectedType
	/>

	<!-- Sub-Header Title -->
	<div class="mb-3 flex items-center gap-0">
		<div class="h-px flex-1 {isDarkMode ? 'bg-zinc-800' : 'bg-zinc-300'}"></div>
		<span
			class="mx-3 inline-flex items-center rounded-full border px-3.5 py-1 text-[12px] font-semibold transition-colors sm:text-[13px] {isDarkMode
				? 'border-zinc-700 bg-zinc-900 text-white'
				: 'border-zinc-300 bg-white text-zinc-800 shadow-sm'}"
		>
			Latest Manga
		</span>
		<div class="h-px flex-1 {isDarkMode ? 'bg-zinc-800' : 'bg-zinc-300'}"></div>
	</div>

	<!-- Content Area -->
	{#if loading}
		<div class="flex min-h-[50vh] w-full items-center justify-center py-20">
			<div class="flex flex-col items-center gap-3">
				<Loader2 class="h-10 w-10 animate-spin text-red-500" />
				<span class="text-sm font-medium {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">
					Loading manga...
				</span>
			</div>
		</div>
	{:else if mangas.length === 0}
		<div class="py-16 text-center {isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}">
			<p>No manga found matching the selected filters.</p>
		</div>
	{:else}
		{#key currentSource}
			<div
				class="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-8"
			>
				{#each mangas as manga (manga.id)}
					<a href="/manga/{manga.sourceId}{manga.id}" class="group block">
						<div
							class="relative overflow-hidden rounded-md bg-zinc-900 ring-1 ring-black/5 dark:ring-white/5"
						>
							<div class="relative aspect-[3/4] w-full overflow-hidden">
								{#if manga.cover}
									<img
										src={proxyImage(manga.cover)}
										data-original={manga.cover}
										alt={manga.title}
										loading="lazy"
										decoding="async"
										onerror={onCoverError}
										class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
									/>
								{:else}
									<div
										class="flex h-full w-full items-center justify-center bg-zinc-800 text-xl text-zinc-600"
									>
										📚
									</div>
								{/if}

								<!-- BADGE STATUS (Atas Kiri) -->
								<span
									class="absolute top-1 left-1 z-20 rounded px-1 py-0.5 text-[8px] font-bold uppercase text-white sm:text-[9px] {statusClass(
										manga.status
									)}"
								>
									{manga.status || 'ONGOING'}
								</span>

								<!-- BADGE CHAPTER (Bawah Status) -->
								{#if manga.latestChapter || (manga as any).chapter}
									<span
										class="absolute top-[18px] left-1 z-20 rounded bg-yellow-400 px-1 py-0.5 text-[8px] font-bold text-black sm:text-[9px]"
									>
										Ch. {manga.latestChapter || (manga as any).chapter}
									</span>
								{/if}

								<!-- BADGE TYPE (Turun Mentok ke Bawah Kiri) -->
								<span
									class="absolute bottom-1 left-1 z-20 rounded px-1 py-0.5 text-[8px] font-bold uppercase text-white shadow-sm sm:text-[9px] {typeBadgeClass(
										manga.type
									)}"
								>
									{manga.type || 'manga'}
								</span>

								<!-- TITLE CONTAINER (Expand ke atas saat Hover / Active pada Mobile & Desktop) -->
								<div
									class="absolute inset-x-0 bottom-0 z-10 max-h-12 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-1 pt-4 pb-1 transition-all duration-300 group-hover:max-h-full group-hover:pt-8 group-active:max-h-full group-active:pt-8"
								>
									<h3
										class="line-clamp-2 text-center text-[10px] font-semibold leading-tight text-white drop-shadow-md transition-all duration-300 group-hover:line-clamp-none group-active:line-clamp-none sm:text-[11px]"
									>
										{manga.title}
									</h3>
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/key}

		<!-- PAGINATION MODERN & JUMP PAGE -->
		<div
			class="mt-8 flex flex-col items-center justify-center gap-4 border-t pt-6 {isDarkMode
				? 'border-zinc-800/80'
				: 'border-zinc-200'}"
		>
			<div class="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
				<div class="flex items-center gap-1 sm:gap-1.5">
					<!-- Prev Button -->
					<button
						onclick={() => goToPage(currentPage - 1)}
						disabled={currentPage <= 1 || loading}
						aria-label="Previous Page"
						class="flex h-9 w-9 items-center justify-center rounded-xl border transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 {isDarkMode
							? 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800'
							: 'border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50'}"
					>
						<ChevronLeft class="h-4 w-4" />
					</button>

					<!-- Numbers -->
					{#each getPaginationRange(currentPage) as item}
						{#if item === '...'}
							<span
								class="px-1.5 text-xs font-semibold {isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}"
							>
								•••
							</span>
						{:else}
							<button
								onclick={() => goToPage(Number(item))}
								disabled={loading}
								class="h-9 min-w-[36px] rounded-xl px-2.5 text-xs font-semibold transition active:scale-95 {currentPage ===
								item
									? 'bg-red-600 text-white shadow-md shadow-red-600/30'
									: isDarkMode
										? 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800'
										: 'border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50'}"
							>
								{item}
							</button>
						{/if}
					{/each}

					<!-- Next Button -->
					<button
						onclick={() => goToPage(currentPage + 1)}
						disabled={loading}
						aria-label="Next Page"
						class="flex h-9 w-9 items-center justify-center rounded-xl border transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 {isDarkMode
							? 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800'
							: 'border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50'}"
					>
						<ChevronRight class="h-4 w-4" />
					</button>
				</div>

				<div class="hidden h-5 w-px bg-zinc-700/50 sm:block"></div>

				<!-- Jump Page Form -->
				<form onsubmit={handleJumpPage} class="flex items-center gap-2">
					<span class="text-xs font-medium {isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}">
						Page
					</span>
					<div class="relative flex items-center">
						<input
							type="number"
							min="1"
							placeholder={String(currentPage)}
							bind:value={jumpPageInput}
							class="h-9 w-14 rounded-xl border px-2 text-center text-xs font-semibold transition-all focus:outline-none focus:ring-1 focus:ring-red-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none {isDarkMode
								? 'border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600'
								: 'border-zinc-200 bg-white text-zinc-800 shadow-sm placeholder:text-zinc-400'}"
						/>
					</div>
					<button
						type="submit"
						disabled={loading || !jumpPageInput}
						aria-label="Go to page"
						class="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white transition hover:bg-red-500 active:scale-95 disabled:opacity-40"
					>
						<ArrowRight class="h-4 w-4" />
					</button>
				</form>
			</div>
		</div>
	{/if}
</div>