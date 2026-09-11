<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { Search, Loader2, ChevronDown, Check } from 'lucide-svelte';
    import { getImpl, setImpl } from '$lib/stores/impl';

    type SourceItem = { id: string; name: string };

    let {
        sources,
        currentSource,
        searchQuery = '',
        loading = $bindable(false),
        selectedLang = $bindable('all'),
        selectedType = $bindable('all')
    }: {
        sources: SourceItem[];
        currentSource: string;
        searchQuery?: string;
        loading?: boolean;
        selectedLang?: string;
        selectedType?: string;
    } = $props();

    // Static Constants
    const LANGUAGES = [
        { id: 'all', name: 'All Languages', flag: 'un', code: 'ALL' },
        { id: 'english', name: 'English', flag: 'gb', code: 'EN' },
        { id: 'japanese', name: 'Japanese', flag: 'jp', code: 'JP' },
        { id: 'chinese', name: 'Chinese', flag: 'cn', code: 'ZH' },
        { id: 'korean', name: 'Korean', flag: 'kr', code: 'KO' },
        { id: 'indonesian', name: 'Indonesian', flag: 'id', code: 'ID' },
        { id: 'spanish', name: 'Spanish', flag: 'es', code: 'ES' },
        { id: 'russian', name: 'Russian', flag: 'ru', code: 'RU' },
        { id: 'french', name: 'French', flag: 'fr', code: 'FR' },
        { id: 'portuguese', name: 'Portuguese', flag: 'pt', code: 'PT' },
        { id: 'thai', name: 'Thai', flag: 'th', code: 'TH' },
        { id: 'vietnamese', name: 'Vietnamese', flag: 'vn', code: 'VI' }
    ] as const;

    const TYPES = [
        { id: 'all', name: 'All Types', icon: '✨', count: 'ALL' },
        { id: 'manga', name: 'Manga', icon: '📖', count: 'MG' },
        { id: 'manhwa', name: 'Manhwa', icon: 'kr', count: 'HW' },
        { id: 'manhua', name: 'Manhua', icon: 'cn', count: 'HU' },
        { id: 'doujinshi', name: 'Doujinshi', icon: '🎨', count: 'DJ' },
        { id: 'artistcg', name: 'Artist CG', icon: '🖼️', count: 'CG' },
        { id: 'gamecg', name: 'Game CG', icon: '🎮', count: 'GCG' },
        { id: 'western', name: 'Western', icon: '🤠', count: 'WST' },
        { id: 'imageset', name: 'Image Set', icon: '📷', count: 'IMG' },
        { id: 'cosplay', name: 'Cosplay', icon: '🎭', count: 'COS' },
        { id: 'non-h', name: 'Non-Hentai', icon: '🌱', count: 'NON' },
        { id: 'magazine', name: 'Magazine', icon: '📰', count: 'MAG' },
        { id: 'anime', name: 'Anime / Screencap', icon: '🎬', count: 'ANI' },
        { id: 'lightnovel', name: 'Light Novel', icon: '📚', count: 'LN' },
        { id: 'webtoon', name: 'Webtoon', icon: '📱', count: 'WEB' },
        { id: 'misc', name: 'Miscellaneous', icon: '📦', count: 'MISC' }
    ] as const;

    const SOURCE_META: Record<string, { flag: string; lang: string; isR18: boolean; color: string }> = {
        asura: { flag: 'gb', lang: 'EN', isR18: false, color: 'bg-emerald-500' },
        asurascans: { flag: 'gb', lang: 'EN', isR18: false, color: 'bg-emerald-500' },
        weloma: { flag: 'jp', lang: 'JP', isR18: false, color: 'bg-blue-500' },
        hitomi: { flag: 'un', lang: 'Multi', isR18: true, color: 'bg-pink-600' },
        hitomila: { flag: 'un', lang: 'Multi', isR18: true, color: 'bg-pink-600' },
        nhentai: { flag: 'un', lang: 'Multi', isR18: true, color: 'bg-rose-600' },
        nhentainet: { flag: 'un', lang: 'Multi', isR18: true, color: 'bg-rose-600' },
        hentaifox: { flag: 'gb', lang: 'EN', isR18: true, color: 'bg-red-600' },
        pornhwa: { flag: 'gb', lang: 'EN', isR18: true, color: 'bg-fuchsia-600' },
        kingcomix: { flag: 'gb', lang: 'EN', isR18: true, color: 'bg-orange-600' },
        ehentai: { flag: 'un', lang: 'Multi', isR18: true, color: 'bg-purple-600' },
        klmanga: { flag: 'jp', lang: 'JP', isR18: false, color: 'bg-yellow-500' },
        komiku: { flag: 'id', lang: 'ID', isR18: false, color: 'bg-green-500' },
        imhentai: { flag: 'un', lang: 'Multi', isR18: true, color: 'bg-pink-600' },
        hentai2read: { flag: 'gb', lang: 'EN', isR18: true, color: 'bg-orange-600' },
        hentairead: { flag: 'gb', lang: 'EN', isR18: true, color: 'bg-orange-600' },
        hentaiera: { flag: 'un', lang: 'Multi', isR18: true, color: 'bg-pink-600' },
        simplyhentai: { flag: 'gb', lang: 'EN', isR18: true, color: 'bg-orange-600' }
    };

    const LANG_LABELS: Record<string, string> = {
        EN: 'English',
        JP: 'Japanese',
        ID: 'Indonesian',
        Multi: 'Multilingual'
    };

    const DEFAULT_META = { flag: 'un', lang: '—', isR18: false, color: 'bg-zinc-600' };

    // Reactive States
    let searchInput = $state('');
    let activeDropdown = $state<'source' | 'lang' | 'type' | null>(null);

    let groupedSources = $derived.by(() => {
        const groups: Record<string, SourceItem[]> = {};

        for (const src of sources) {
            const meta = getMeta(src.id);
            const langKey = meta.lang || 'Other';
            if (!groups[langKey]) groups[langKey] = [];
            groups[langKey].push(src);
        }

        return groups;
    });

    // Derived Helper
    let currentSourceName = $derived(sources.find((s) => s.id === currentSource)?.name || currentSource);
    let currentLangObj = $derived(LANGUAGES.find((l) => l.id === selectedLang) || LANGUAGES[0]);
    let currentTypeObj = $derived(TYPES.find((t) => t.id === selectedType) || TYPES[0]);

    $effect(() => {
        searchInput = searchQuery;
    });

    function getMeta(id: string) {
        if (!id) return DEFAULT_META;

        const cleanId = id.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (SOURCE_META[cleanId]) {
            return SOURCE_META[cleanId];
        }

        const matchedKey = Object.keys(SOURCE_META).find((key) => cleanId.includes(key));

        return matchedKey ? SOURCE_META[matchedKey] : DEFAULT_META;
    }

    function toggleDropdown(type: 'source' | 'lang' | 'type') {
        activeDropdown = activeDropdown === type ? null : type;
    }

    function closeDropdown() {
        activeDropdown = null;
    }

    function clickOutside(node: HTMLElement) {
        const handleClick = (event: MouseEvent) => {
            if (!node.contains(event.target as Node)) closeDropdown();
        };
        document.addEventListener('click', handleClick, true);
        return {
            destroy() {
                document.removeEventListener('click', handleClick, true);
            }
        };
    }

    onMount(() => {
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
    });

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

    function selectLang(id: string) {
        selectedLang = id;
        closeDropdown();
        applyFilters();
    }

    function selectType(id: string) {
        selectedType = id;
        closeDropdown();
        applyFilters();
    }

    function selectSource(id: string) {
        closeDropdown();
        if (id === currentSource) return;
        setImpl(id);
        selectedLang = 'all';
        selectedType = 'all';
        goto(`/?source=${id}`, { invalidateAll: true, keepFocus: true });
    }

    function handleSearch(e: SubmitEvent) {
        e.preventDefault();
        applyFilters();
    }
</script>

{#snippet renderIcon(icon: string)}
    {#if /^[a-z]{2}$/i.test(icon)}
        <span class="fi fi-{icon} rounded-sm"></span>
    {:else}
        {icon}
    {/if}
{/snippet}

<!-- BAR FILTER & SEARCH -->
<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3" use:clickOutside>
    <!-- ========== CUSTOM SOURCE DROPDOWN WITH SECTION HEADERS ========== -->
    <div class="relative">
        <button
            type="button"
            onclick={() => toggleDropdown('source')}
            aria-expanded={activeDropdown === 'source'}
            class="filter-btn flex min-w-0 w-full sm:w-auto sm:min-w-[140px] items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium shadow-sm transition active:scale-[0.98]"
        >
            <span class="flex items-center text-base leading-none">
                {@render renderIcon(getMeta(currentSource).flag)}
            </span>
            <span class="max-w-[110px] truncate">{currentSourceName}</span>

            {#if getMeta(currentSource).isR18}
                <span class="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                    R18
                </span>
            {/if}

            <ChevronDown
                class="ml-auto h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 {activeDropdown === 'source' ? 'rotate-180' : ''}"
            />
        </button>

        {#if activeDropdown === 'source'}
            <div
                class="dropdown-menu absolute left-0 top-full z-50 mt-2 w-[280px] overflow-hidden rounded-2xl border shadow-2xl"
            >
                <div class="max-h-[60vh] overflow-y-auto p-1.5">
                    <!-- LOOP BERDASARKAN KELOMPOK BAHASA -->
                    {#each Object.entries(groupedSources) as [langKey, items]}
                        <!-- SECTION HEADER (English, Japanese, etc.) -->
                        <div
                            class="dropdown-header sticky top-0 z-10 -mx-1.5 my-1 px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                        >
                            {LANG_LABELS[langKey] || langKey}
                        </div>

                        <!-- ITEM DALAM KELOMPOK TERSEBUT -->
                        {#each items as source (source.id)}
                            {@const meta = getMeta(source.id)}
                            {@const isSelected = source.id.toLowerCase() === currentSource.toLowerCase()}
                            <button
                                type="button"
                                onclick={() => selectSource(source.id)}
                                class="dropdown-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition {isSelected ? 'active-item' : ''}"
                            >
                                <span
                                    class="icon-wrapper flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                                >
                                    {@render renderIcon(meta.flag)}
                                </span>

                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2">
                                        <span class="truncate text-sm font-medium">{source.name}</span>
                                        {#if meta.isR18}
                                            <span
                                                class="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white"
                                            >
                                                R18
                                            </span>
                                        {/if}
                                    </div>
                                    <p class="mt-0.5 text-[11px] opacity-60">
                                        {meta.lang}
                                    </p>
                                </div>

                                {#if isSelected}
                                    <Check class="h-4 w-4 shrink-0 text-red-500" />
                                {/if}
                            </button>
                        {/each}
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <!-- ========== CUSTOM LANGUAGE DROPDOWN ========== -->
    {#if ['hitomi', 'nhentai','imhentai','ehentai','hentaiera'].includes(currentSource.toLowerCase())}
        <div class="relative">
            <button
                type="button"
                onclick={() => toggleDropdown('lang')}
                aria-expanded={activeDropdown === 'lang'}
                class="filter-btn flex min-w-0 w-full sm:w-auto sm:min-w-[130px] items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium shadow-sm transition active:scale-[0.98]"
            >
                <span class="flex items-center text-base leading-none">
                    {@render renderIcon(currentLangObj.flag)}
                </span>
                <span class="max-w-[90px] truncate">{currentLangObj.name}</span>

                <ChevronDown
                    class="ml-auto h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 {activeDropdown === 'lang' ? 'rotate-180' : ''}"
                />
            </button>

            {#if activeDropdown === 'lang'}
                <div
                    class="dropdown-menu absolute left-0 top-full z-50 mt-2 w-[240px] overflow-hidden rounded-2xl border shadow-2xl"
                >
                    <div class="max-h-[60vh] overflow-y-auto p-1.5">
                        {#each LANGUAGES as lang (lang.id)}
                            {@const isSelected = lang.id === selectedLang}
                            <button
                                type="button"
                                onclick={() => selectLang(lang.id)}
                                class="dropdown-item flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition {isSelected ? 'active-item' : ''}"
                            >
                                <span class="flex h-7 w-7 shrink-0 items-center justify-center text-base">
                                    {@render renderIcon(lang.flag)}
                                </span>
                                <span class="flex-1 truncate text-sm font-medium">{lang.name}</span>
                                <span
                                    class="code-badge rounded px-1.5 py-0.5 font-mono text-[10px] uppercase opacity-70"
                                >
                                    {lang.code}
                                </span>
                                {#if isSelected}
                                    <Check class="h-4 w-4 shrink-0 text-red-500" />
                                {/if}
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    {/if}

    <!-- ========== CUSTOM TYPE DROPDOWN ========== -->
    <div class="relative">
        <button
            type="button"
            onclick={() => toggleDropdown('type')}
            aria-expanded={activeDropdown === 'type'}
            class="filter-btn flex min-w-0 w-full sm:w-auto sm:min-w-[120px] items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium shadow-sm transition active:scale-[0.98]"
        >
            <span class="flex items-center text-base leading-none">
                {@render renderIcon(currentTypeObj.icon)}
            </span>
            <span class="max-w-[90px] truncate">{currentTypeObj.name}</span>

            <ChevronDown
                class="ml-auto h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 {activeDropdown === 'type' ? 'rotate-180' : ''}"
            />
        </button>

        {#if activeDropdown === 'type'}
            <div
                class="dropdown-menu absolute left-0 top-full z-50 mt-2 w-[220px] overflow-hidden rounded-2xl border shadow-2xl"
            >
                <div class="max-h-[60vh] overflow-y-auto p-1.5">
                    {#each TYPES as t (t.id)}
                        {@const isSelected = t.id === selectedType}
                        <button
                            type="button"
                            onclick={() => selectType(t.id)}
                            class="dropdown-item flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition {isSelected ? 'active-item' : ''}"
                        >
                            <span class="flex h-7 w-7 shrink-0 items-center justify-center text-base">
                                {@render renderIcon(t.icon)}
                            </span>
                            <span class="flex-1 truncate text-sm font-medium">{t.name}</span>
                            {#if isSelected}
                                <Check class="h-4 w-4 shrink-0 text-red-500" />
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <!-- SEARCH FORM -->
<form class="flex min-w-0 w-full basis-full gap-2 sm:max-w-md sm:flex-1 sm:basis-auto" onsubmit={handleSearch}>
        <div class="relative min-w-0 flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40" />
            <input
                type="text"
                placeholder="Search manga..."
                bind:value={searchInput}
                class="filter-btn w-full rounded-full border py-2.5 pl-9 pr-4 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-red-500"
            />
        </div>
        <button
            type="submit"
            disabled={loading}
            class="shrink-0 rounded-full bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
        >
            {#if loading}
                <Loader2 class="h-4 w-4 animate-spin" />
            {:else}
                Search
            {/if}
        </button>
    </form>
</div>

<!-- FILTER STATUS INDICATOR -->
{#if searchQuery || selectedLang !== 'all' || selectedType !== 'all'}
    <p class="mb-3 text-sm opacity-70">
        Filtering active:
        {#if searchQuery}
            <span class="font-semibold text-red-500">"{searchQuery}"</span>
        {/if}
        {#if selectedLang !== 'all'}
            <span class="ml-2 rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-500">
                Lang: {currentLangObj.name}
            </span>
        {/if}
        {#if selectedType !== 'all'}
            <span class="ml-2 rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-500">
                Type: {currentTypeObj.name}
            </span>
        {/if}
        <a href="/?source={currentSource}" class="ml-3 text-red-500 hover:underline">Clear all</a>
    </p>
{/if}

<style>
    .filter-btn {
        background-color: var(--bg-card, #ffffff);
        color: var(--text-color, #18181b);
        border-color: var(--border-color, #e4e4e7);
    }

    .dropdown-menu {
        background-color: var(--bg-card, #ffffff);
        color: var(--text-color, #18181b);
        border-color: var(--border-color, #e4e4e7);
    }

    .dropdown-header {
        background-color: var(--bg-subtle, #f4f4f5);
        color: var(--text-muted, #71717a);
    }

    .dropdown-item {
        color: var(--text-color, #27272a);
    }

    .dropdown-item:hover {
        background-color: var(--hover-bg, #f4f4f5);
    }

    .active-item {
        background-color: rgba(239, 68, 68, 0.12) !important;
        color: #ef4444 !important;
    }

    .icon-wrapper, .code-badge {
        background-color: var(--bg-subtle, #f4f4f5);
    }

    :global(html.dark) .filter-btn,
    :global(body.dark) .filter-btn,
    :global(.dark) .filter-btn {
        background-color: #18181b;
        color: #f4f4f5;
        border-color: #27272a;
    }

    :global(html.dark) .dropdown-menu,
    :global(body.dark) .dropdown-menu,
    :global(.dark) .dropdown-menu {
        background-color: #18181b;
        color: #f4f4f5;
        border-color: #27272a;
    }

    :global(html.dark) .dropdown-header,
    :global(body.dark) .dropdown-header,
    :global(.dark) .dropdown-header {
        background-color: #27272a;
        color: #a1a1aa;
    }

    :global(html.dark) .dropdown-item,
    :global(body.dark) .dropdown-item,
    :global(.dark) .dropdown-item {
        color: #e4e4e7;
    }

    :global(html.dark) .dropdown-item:hover,
    :global(body.dark) .dropdown-item:hover,
    :global(.dark) .dropdown-item:hover {
        background-color: #27272a;
    }

    :global(html.dark) .icon-wrapper,
    :global(body.dark) .icon-wrapper,
    :global(.dark) .icon-wrapper,
    :global(html.dark) .code-badge,
    :global(body.dark) .code-badge,
    :global(.dark) .code-badge {
        background-color: #27272a;
    }
</style>