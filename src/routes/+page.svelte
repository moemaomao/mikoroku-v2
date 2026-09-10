<script lang="ts">
    import type { PageData } from './$types';
    import { goto, invalidate } from '$app/navigation';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { Search, ChevronLeft, ChevronRight, Loader2, Filter } from 'lucide-svelte';
    import { getImpl, setImpl } from '$lib/stores/impl';

    const { data }: { data: PageData } = $props();
    let { mangas, sources, currentSource, currentPage, searchQuery } = $derived(data);

    let searchInput = $derived(searchQuery || '');
    let loading = $state(false);
    let isDarkMode = $state(true);

    // State Tambahan untuk Filter Bahasa & Type
    let selectedLang = $state($page.url.searchParams.get('lang') || 'all');
    let selectedType = $state($page.url.searchParams.get('type') || 'all');

    // Daftar Pilihan Bahasa
    const languages = [
        { id: 'all', name: 'All Languages' },
        { id: 'english', name: 'English' },
        { id: 'japanese', name: 'Japanese' },
        { id: 'chinese', name: 'Chinese' },
        { id: 'korean', name: 'Korean' },
        { id: 'indonesian', name: 'Indonesian' },
        { id: 'spanish', name: 'Spanish' },
        { id: 'russian', name: 'Russian' },
        { id: 'french', name: 'French' },
        { id: 'portuguese', name: 'Portuguese' },
        { id: 'thai', name: 'Thai' },
        { id: 'vietnamese', name: 'Vietnamese' }
    ];
    const types = [
	{ id: 'all', name: 'All Types' },
	{ id: 'doujinshi', name: 'Doujinshi' },
	{ id: 'manga', name: 'Manga' },
	{ id: 'artistcg', name: 'Artist CG' },
	{ id: 'gamecg', name: 'Game CG' },
	{ id: 'imageset', name: 'Image Set' },
	{ id: 'cosplay', name: 'Cosplay' },
	{ id: 'asianporn', name: 'Asian Porn' },
	{ id: 'non-h', name: 'Non-H' },
	{ id: 'western', name: 'Western' },
	{ id: 'misc', name: 'Misc' },
	{ id: 'manhwa', name: 'Manhwa' },
	{ id: 'manhua', name: 'Manhua' },
	{ id: 'comic', name: 'Comic' }
];

    function updateThemeState() {
        if (typeof document !== 'undefined') {
            isDarkMode = document.documentElement.classList.contains('dark');
        }
    }

    $effect(() => {
        searchInput = searchQuery || '';
        selectedLang = $page.url.searchParams.get('lang') || 'all';
        selectedType = $page.url.searchParams.get('type') || 'all';
    });

    onMount(() => {
        updateThemeState();
        const observer = new MutationObserver(updateThemeState);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        const urlParams = new URLSearchParams($page.url.search);
        if (!urlParams.has('source')) {
            const storedImpl = getImpl();
            if (storedImpl && storedImpl !== currentSource) {
                goto(`/?source=${storedImpl}`, { invalidateAll: true });
                return;
            }
        }

        if (currentSource && currentSource !== getImpl()) {
            setImpl(currentSource);
        }

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

    function applyFilters() {
        const params = new URLSearchParams();
        params.set('source', currentSource);
        if (searchInput.trim()) params.set('q', searchInput.trim());
        if (selectedLang !== 'all') params.set('lang', selectedLang);
        if (selectedType !== 'all') params.set('type', selectedType);
        navigate(params);
    }

    function handleSearch(e: SubmitEvent) {
        e.preventDefault();
        applyFilters();
    }

    async function handleSourceChange(e: Event) {
        const next = (e.currentTarget as HTMLSelectElement).value;
        setImpl(next);
        selectedLang = 'all';
        selectedType = 'all';
        await goto(`/?source=${next}`, { invalidateAll: true, keepFocus: true });
    }

    function goToPage(p: number) {
        if (p < 1) return;
        const params = new URLSearchParams();
        params.set('source', currentSource);
        params.set('page', String(p));
        if (searchQuery) params.set('q', searchQuery);
        if (selectedLang !== 'all') params.set('lang', selectedLang);
        if (selectedType !== 'all') params.set('type', selectedType);
        navigate(params);
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
	const t = (type || 'manga').toLowerCase().replace(/\s+/g, '');
	switch (t) {
		case 'doujinshi':
			return 'bg-[#9E0B0F]';
		case 'manga':
			return 'bg-[#c91714]';
		case 'artistcg':
			return 'bg-[#1a7a4c]';
		case 'gamecg':
			return 'bg-[#1a7a4c]';
		case 'imageset':
			return 'bg-[#5f5f5f]';
		case 'cosplay':
			return 'bg-[#9b4e00]';
		case 'asianporn':
			return 'bg-[#a55ca5]';
		case 'non-h':
		case 'nonh':
			return 'bg-[#0c8a3e]';
		case 'western':
			return 'bg-[#5d4037]';
		case 'misc':
			return 'bg-[#6a6a6a]';
		case 'manhwa':
			return 'bg-[#1976D2]';
		case 'manhua':
			return 'bg-[#2E7D32]';
		case 'comic':
			return 'bg-[#6A1B9A]';
		case 'anime':
			return 'bg-[#7b1fa2]';
		default:
			return 'bg-[#c91714]';
	}
}
</script>

<svelte:head>
    <title>Mikoroku - Browse Manga</title>
</svelte:head>

<div class="mx-auto w-full max-w-none px-2 py-3 sm:px-3 sm:py-4 lg:px-4">
    <!-- BAR FILTER & SEARCH -->
    <div class="mb-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        
        <!-- Dropdown Filters (Baris 1 di Mobile) -->
        <div class="flex w-full items-center gap-2 sm:w-auto">
            <!-- Select Source -->
            <select
                value={currentSource}
                onchange={handleSourceChange}
                class="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors sm:flex-none {isDarkMode
                    ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                    : 'border-zinc-300 bg-white text-zinc-800'}"
            >
                {#each sources as source}
                    <option value={source.id}>{source.name}</option>
                {/each}
            </select>

            <!-- Select Language -->
            {#if ['hitomi', 'nhentai', 'hentaifox','pornhwa', 'kingcomix', 'ehentai'].includes(currentSource)}
                <select
                    bind:value={selectedLang}
                    onchange={applyFilters}
                    class="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors sm:flex-none {isDarkMode
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                        : 'border-zinc-300 bg-white text-zinc-800'}"
                >
                    {#each languages as lang}
                        <option value={lang.id}>{lang.name}</option>
                    {/each}
                </select>
            {/if}

            <!-- Select Type -->
            <select
                bind:value={selectedType}
                onchange={applyFilters}
                class="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors sm:flex-none {isDarkMode
                    ? 'border-zinc-700 bg-zinc-900 text-zinc-200'
                    : 'border-zinc-300 bg-white text-zinc-800'}"
            >
                {#each types as t}
                    <option value={t.id}>{t.name}</option>
                {/each}
            </select>
        </div>

        <!-- Input Search Form (Baris 2 di Mobile) -->
        <form class="flex w-full min-w-0 gap-2 sm:w-auto sm:max-w-md sm:flex-1" onsubmit={handleSearch}>
            <div class="relative min-w-0 flex-1">
                <Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                    type="text"
                    placeholder="Search manga..."
                    bind:value={searchInput}
                    class="w-full rounded-full border py-2 pr-4 pl-9 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors {isDarkMode
                        ? 'border-zinc-700 bg-zinc-900/80 text-zinc-200 placeholder:text-zinc-500'
                        : 'border-zinc-300 bg-white text-zinc-800 placeholder:text-zinc-400'}"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                class="shrink-0 rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
            >
                {#if loading}
                    <Loader2 class="h-4 w-4 animate-spin" />
                {:else}
                    Search
                {/if}
            </button>
        </form>
    </div>

    {#if searchQuery || selectedLang !== 'all' || selectedType !== 'all'}
        <p class="mb-3 text-sm {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">
            Filtering active: 
            {#if searchQuery}<span class="font-semibold text-red-400">"{searchQuery}"</span> {/if}
            {#if selectedLang !== 'all'}<span class="ml-2 rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-300">Lang: {selectedLang}</span>{/if}
            {#if selectedType !== 'all'}<span class="ml-2 rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-300">Type: {selectedType}</span>{/if}
            <a href="/?source={currentSource}" class="ml-3 text-red-500 hover:underline">Clear all</a>
        </p>
    {/if}

    <!-- Sub-Header Title -->
    <div class="mb-3 flex items-center gap-0">
        <div class="h-px flex-1 {isDarkMode ? 'bg-zinc-800' : 'bg-zinc-300'}"></div>
        <span
            class="mx-3 inline-flex items-center rounded-full border px-3.5 py-1 text-[12px] font-semibold sm:text-[13px] transition-colors {isDarkMode
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
                <span class="text-sm font-medium {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">Loading manga...</span>
            </div>
        </div>
    {:else if mangas.length === 0}
        <div class="py-16 text-center {isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}">
            <p>No manga found matching the selected filters.</p>
        </div>
    {:else}
        <div class="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-6 md:gap-2 lg:grid-cols-8 xl:grid-cols-9 2xl:grid-cols-10">
            {#each mangas as manga}
                <a href="/manga/{manga.sourceId}{manga.id}" class="group block">
                    <div class="relative overflow-hidden rounded-md bg-zinc-900 ring-1 ring-black/5 dark:ring-white/5">
                        <div class="relative aspect-[2/3] w-full overflow-hidden">
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
                                <div class="flex h-full w-full items-center justify-center bg-zinc-800 text-xl text-zinc-600">📚</div>
                            {/if}

                            <span class="absolute top-1 left-1 z-20 rounded px-1 py-0.5 text-[8px] font-bold uppercase text-white sm:text-[9px] {statusClass(manga.status)}">
                                {manga.status || 'ONGOING'}
                            </span>

                            {#if manga.latestChapter || (manga as any).chapter}
                                <span class="absolute top-[18px] left-1 z-20 rounded bg-yellow-400 px-1 py-0.5 text-[8px] font-bold text-black sm:text-[9px]">
                                    Ch. {manga.latestChapter || (manga as any).chapter}
                                </span>
                            {/if}

                            <!-- TITLE OVERLAY - Expand ke atas saat hover -->
                            <div class="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-1.5 pb-1.5 pt-8 transition-all duration-300 ease-out group-hover:from-black/95 group-hover:via-black/85 group-hover:pt-20">
                                <h3 class="line-clamp-2 text-center text-[10px] font-semibold leading-snug text-white drop-shadow-md transition-all duration-300 sm:text-[11px] group-hover:line-clamp-5">
                                    {manga.title}
                                </h3>
                            </div>

                            <!-- BADGE TYPE: MENTOK POJOK KIRI BAWAH DI ATAS OVERLAY -->
                            <span class="absolute bottom-1 left-1 z-20 rounded px-1 py-0.5 text-[8px] font-bold uppercase text-white sm:text-[9px] {typeBadgeClass(manga.type)}">
                                {manga.type || 'manga'}
                            </span>
                        </div>
                    </div>
                </a>
            {/each}
        </div>

        {#if !searchQuery}
            <div class="mt-6 flex items-center justify-center gap-3 border-t pt-5 {isDarkMode ? 'border-zinc-800/50' : 'border-zinc-300'}">
                <button
                    onclick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    class="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-30 {isDarkMode
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                        : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 shadow-sm'}"
                >
                    <ChevronLeft class="h-4 w-4" /> Previous
                </button>

                <span class="text-sm {isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}">
                    Page <span class="font-medium {isDarkMode ? 'text-white' : 'text-zinc-900'}">{currentPage}</span>
                </span>

                <button
                    onclick={() => goToPage(currentPage + 1)}
                    disabled={loading}
                    class="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-30 {isDarkMode
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                        : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 shadow-sm'}"
                >
                    Next <ChevronRight class="h-4 w-4" />
                </button>
            </div>
        {/if}
    {/if}
</div>