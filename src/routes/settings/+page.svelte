<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, Settings } from 'lucide-svelte';
	import { getPreferredSources, setPreferredSources } from '$lib/stores/preferredSources';
	import { getSourceMeta, groupSourcesByLang, LANG_LABELS } from '$lib/utils/sourceMeta';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	let preferred = $state<string[]>([]);
	let isDarkMode = $state(true);
	let saved = $state(false);

	let grouped = $derived(groupSourcesByLang(data.sources));

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
		preferred = preferred.includes(id)
			? preferred.filter((s) => s !== id)
			: [...preferred, id];
		saved = false;
	}

	function save() {
		setPreferredSources(preferred);
		saved = true;
		setTimeout(() => {
			window.location.href = '/';
		}, 300);
	}

	function selectAll() {
		preferred = data.sources.map((s) => s.id);
		saved = false;
	}

	function selectNone() {
		preferred = [];
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
			<h1 class="text-xl font-bold sm:text-2xl">Source Preferences</h1>
			<p class="mt-0.5 text-sm {isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}">
				Choose which sources appear on the homepage. Manga will be merged and sorted from the latest updates.
				Leave empty to disable multi-source and use the source dropdown instead.
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
			Select All
		</button>
		<button
			onclick={selectNone}
			class="rounded-lg border px-3 py-1.5 text-xs font-medium transition
				{isDarkMode ? 'border-zinc-700 hover:bg-zinc-800' : 'border-zinc-300 hover:bg-zinc-100'}"
		>
			Clear All
		</button>
		<span class="ml-auto text-xs {isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}">
			{preferred.length} source{preferred.length === 1 ? '' : 's'} selected
		</span>
	</div>

	<!-- Source checklist -->
	<div class="space-y-5">
		{#each Object.entries(grouped) as [langKey, items]}
			<div>
				<h2
					class="mb-2 text-xs font-bold uppercase tracking-wider {isDarkMode
						? 'text-zinc-500'
						: 'text-zinc-400'}"
				>
					{LANG_LABELS[langKey] || langKey}
				</h2>
				<div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
					{#each items as src (src.id)}
						{@const meta = getSourceMeta(src.id)}
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
			{isDarkMode
				? 'border-zinc-800 bg-zinc-900/95 backdrop-blur'
				: 'border-zinc-200 bg-white/95 backdrop-blur'}"
	>
		<p class="max-w-[70%] text-xs {isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}">
			{#if preferred.length === 0}
				No sources selected — multi-source homepage will be empty. Use the source dropdown to browse a single source.
			{:else}
				{preferred.length} source{preferred.length === 1 ? '' : 's'} will be shown on the homepage.
			{/if}
		</p>
		<button
			onclick={save}
			class="shrink-0 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition
				hover:bg-red-500 active:scale-95"
		>
			{saved ? 'Saved ✓' : 'Save'}
		</button>
	</div>
</div>