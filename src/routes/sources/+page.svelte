<script lang="ts">
	import type { PageData } from './$types';
	import { setImpl } from '$lib/stores/impl';
	import { goto } from '$app/navigation';
	import { Globe, ArrowRight } from 'lucide-svelte';

	// 1. Terima props dari +page.server.ts
	let { data }: { data: PageData } = $props();

	// 2. Ambil data sources yang valid
	let sources = $derived(data.sources ?? []);

	// 3. Handler saat pengguna memilih sumber manga
	function handleSelectSource(sourceId: string) {
		setImpl(sourceId);
		goto(`/?source=${sourceId}`);
	}
</script>

<svelte:head>
	<title>Mikoroku - Manga Sources</title>
	<meta name="description" content="Select a manga source" />
</svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 py-8">
	<!-- Header Section -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-white sm:text-3xl">Pilih Sumber Manga</h1>
		<p class="mt-2 text-sm text-zinc-400">
			Pilih salah satu sumber di bawah ini untuk mulai menjelajahi katalog.
		</p>
	</div>

	<!-- Sources Grid -->
	{#if sources.length === 0}
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
			Tidak ada sumber manga yang tersedia.
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each sources as source}
				<button
					type="button"
					onclick={() => handleSelectSource(source.id)}
					class="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-left transition duration-200 hover:border-violet-500/50 hover:bg-zinc-800/60 focus:outline-none focus:ring-2 focus:ring-violet-500"
				>
					<div>
						<div class="flex items-center justify-between">
							<span class="text-base font-semibold text-zinc-100 group-hover:text-violet-400">
								{source.name}
							</span>
							<ArrowRight class="h-4 w-4 -translate-x-1 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 text-violet-400" />
						</div>

						<div class="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
							<Globe class="h-3.5 w-3.5 shrink-0" />
							<span class="truncate">{source.baseUrl}</span>
						</div>
					</div>

					<div class="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
						<span>ID: <code class="text-zinc-300">{source.id}</code></span>
						<span class="font-medium text-violet-400 group-hover:underline">Pilih &rarr;</span>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>