<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, Settings, RotateCcw } from 'lucide-svelte';
	import {
		getPreferredSources,
		setPreferredSources
	} from '$lib/stores/preferredSources';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	let preferred = $state<string[]>([]);
	let isDarkMode = $state(true);
	let saved = $state(false);

	// Meta sama seperti BrowseHeader (bisa di-extract nanti)
	const SOURCE_META: Record<string, { flag: string; lang: string; isR18: boolean }> = {
		asura: { flag: 'gb', lang: 'EN', isR18: false },
		mangakatana: { flag: 'gb', lang: 'EN', isR18: false },
		mangabatscom: { flag: 'gb', lang: 'EN', isR18: false },
		mangabats: { flag: 'gb', lang: 'EN', isR18: false },
		weloma: { flag: 'jp', lang: 'JP', isR18: false },
		hitomi: { flag: 'un', lang: 'Multi', isR18: true },
		nhentai: { flag: 'un', lang: 'Multi', isR18: true },
		hentaifox: { flag: 'gb', lang: 'EN', isR18: true },
		pornhwa: { flag: 'gb', lang: 'EN', isR18: true },
		kingcomix: { flag: 'gb', lang: 'EN', isR18: true },
		ehentai: { flag: 'un', lang: 'Multi', isR18: true },
		klmanga: { flag: 'jp', lang: 'JP', isR18: false },
		klz9: { flag: 'jp', lang: 'JP', isR18: false },
		love4u: { flag: 'jp', lang: 'JP', isR18: false },
		mangadex: { flag: 'un', lang: 'Multi', isR18: false },
		rawkuma: { flag: 'jp', lang: 'JP', isR18: false },
		komiku: { flag: 'id', lang: 'ID', isR18: false },
		voratoon: { flag: 'id', lang: 'ID', isR18: false },
		softkomik: { flag: 'id', lang: 'ID', isR18: false },
		komikindo: { flag: 'id', lang: 'ID', isR18: false },
		mangaindo: { flag: 'id', lang: 'ID', isR18: false },
		mgkomik: { flag: 'id', lang: 'ID', isR18: false },
		doujindesu: { flag: 'id', lang: 'ID', isR18: true },
		crotpedia: { flag: 'id', lang: 'ID', isR18: true },
		bacakomik: { flag: 'id', lang: 'ID', isR18: true },
		pixhentai: { flag: 'id', lang: 'ID', isR18: true },
		imhentai: { flag: 'un', lang: 'Multi', isR18: true },
		hentai2read: { flag: 'gb', lang: 'EN', isR18: true },
		hentairead: { flag: 'gb', lang: 'EN', isR18: true },
		hentaiera: { flag: 'un', lang: 'Multi', isR18: true },
		simplyhentai: { flag: 'gb', lang: 'EN', isR18: true },
		zonatmo: { flag: 'es', lang: 'ES', isR18: false },
		lectortmo: { flag: 'es', lang: 'ES', isR18: false },
		mangacopy: { flag: 'cn', lang: 'CN', isR18: false },
		omegascans: { flag: 'gb', lang: 'EN', isR18: true },
		luvyaa: { flag: 'id', lang: 'ID', isR18: true },
		kiryuu: { flag: 'id', lang: 'ID', isR18: false },
		komikstation: { flag: 'id', lang: 'ID', isR18: false },
		shinigami: { flag: 'id', lang: 'ID', isR18: false }
	};

	const DEFAULT_META = { flag: 'un', lang: 'Other', isR18: false };

	function getMeta(id: string) {
		const clean = id.toLowerCase().replace(/[^a-z0-9]/g, '');
		if (SOURCE_META[clean]) return SOURCE_META[clean];
		const key = Object.keys(SOURCE_META).find((k) => clean.includes(k));
		return key ? SOURCE_META[key] : DEFAULT_META;
	}

	let grouped = $derived.by(() => {
		const groups: Record<string, typeof data.sources> = {};
		for (const src of data.sources) {
			const meta = getMeta(src.id);
			const key = meta.lang || 'Other';
			if (!groups[key]) groups[key] = [];
			groups[key].push(src);
		}
		const order = ['Multi', 'JP', 'EN', 'ID', 'ES', 'CN'];
		const sorted: Record<string, typeof data.sources> = {};
		for (const k of order) {
			if (groups[k]) sorted[k] = groups[k];
		}
		for (const k of Object.keys(groups).sort()) {
			if (!sorted[k]) sorted[k] = groups[k];
		}
		return sorted;
	});

	onMount(() => {
		preferred = getPreferredSources();
		isDarkMode = document.documentElement.classList.contains('dark');
		const obs = new MutationObserver(() => {
			isDarkMode = document.documentElement.classList.contains('dark');
		});
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => obs.disconnect();
	});

	function toggle(id: string) {
		if (preferred.includes(id)) {
			preferred = preferred.filter((s) => s !== id);
		} else {
			preferred = [...preferred, id];
		}
		saved = false;
	}

	function save() {
		setPreferredSources(preferred);
		saved = true;
		setTimeout(() => (saved = false), 2000);
	}

	function selectAll() {
		preferred = data.sources.map((s) => s.id);
		saved = false;
	}

	function selectNone() {
		preferred = [];
		saved = false;
	}

	function resetDefault() {
		preferred = ['asura', 'komiku', 'kiryuu', 'mangadex'];
		saved = false;
	}
</script>

<svelte:head>
	<title>Settings - Source Preferences | Rokuyomu</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
	<div class="mb-6 flex items-center gap-3">
		<div class="rounded-xl bg-red-600/20 p-2.5">
			<Settings class="h-6 w-6 text-red-500" />
		</div>
		<div>
			<h1 class="text-xl font-bold sm:text-2xl">Pengaturan Source</h1>
			<p class="mt-0.5 text-sm {isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}">
				Pilih source yang ingin ditampilkan di homepage. Manga akan di-merge & diurutkan dari yang terbaru.
			</p>
		</div>
	</div>

	<!-- Actions -->
	<div class="mb-5 flex flex-wrap items-center gap-2">
		<button
			onclick={selectAll}
			class="rounded-lg border px-3 py-1.5 text-xs font-medium transition
				{isDarkMode ? 'border-zinc-700 hover:bg-zinc-800' : 'border-zinc-300 hover:bg-zinc-100'}"
		>
			Pilih Semua
		</button>
		<button
			onclick={selectNone}
			class="rounded-lg border px-3 py-1.5 text-xs font-medium transition
				{isDarkMode ? 'border-zinc-700 hover:bg-zinc-800' : 'border-zinc-300 hover:bg-zinc-100'}"
		>
			Hapus Semua
		</button>
		<button
			onclick={resetDefault}
			class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition
				{isDarkMode ? 'border-zinc-700 hover:bg-zinc-800' : 'border-zinc-300 hover:bg-zinc-100'}"
		>
			<RotateCcw class="h-3.5 w-3.5" /> Reset Default
		</button>
		<span class="ml-auto text-xs {isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}">
			{preferred.length} source dipilih
		</span>
	</div>

	<!-- Source checklist -->
	<div class="space-y-5">
		{#each Object.entries(grouped) as [langKey, items]}
			<div>
				<h2 class="mb-2 text-xs font-bold uppercase tracking-wider {isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}">
					{langKey === 'Multi' ? 'Multilingual' : langKey}
				</h2>
				<div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
					{#each items as src (src.id)}
						{@const meta = getMeta(src.id)}
						{@const active = preferred.includes(src.id)}
						<button
							type="button"
							onclick={() => toggle(src.id)}
							class="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition
								{active
									? isDarkMode
										? 'border-red-600/60 bg-red-600/10'
										: 'border-red-500 bg-red-50'
									: isDarkMode
										? 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
										: 'border-zinc-200 bg-white hover:border-zinc-300'}"
						>
							<div
								class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition
									{active
										? 'border-red-500 bg-red-600 text-white'
										: isDarkMode
											? 'border-zinc-600'
											: 'border-zinc-300'}"
							>
								{#if active}
									<Check class="h-3.5 w-3.5" />
								{/if}
							</div>
							<span class="fi fi-{meta.flag} text-sm"></span>
							<span class="min-w-0 flex-1 truncate text-sm font-medium">{src.name}</span>
							{#if meta.isR18}
								<span class="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">R18</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<!-- Save bar -->
	<div
		class="sticky bottom-4 mt-8 flex items-center justify-between gap-3 rounded-2xl border p-3 shadow-xl
			{isDarkMode ? 'border-zinc-800 bg-zinc-900/95 backdrop-blur' : 'border-zinc-200 bg-white/95 backdrop-blur'}"
	>
		<p class="text-xs {isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}">
			{#if preferred.length === 0}
				Pilih minimal 1 source.
			{:else}
				{preferred.length} source akan ditampilkan di homepage.
			{/if}
		</p>
		<button
			onclick={save}
			disabled={preferred.length === 0}
			class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition
				hover:bg-red-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
		>
			{saved ? 'Tersimpan ✓' : 'Simpan'}
		</button>
	</div>
</div>