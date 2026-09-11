<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { BookX, Home, ArrowLeft, AlertTriangle } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let isDarkMode = $state(true);

	function syncTheme() {
		if (!browser) return;
		const saved = localStorage.getItem('darkMode');
		if (saved !== null) {
			isDarkMode = saved === 'true';
		} else {
			isDarkMode = !document.documentElement.classList.contains('light');
		}
	}

	onMount(() => {
		syncTheme();
		const obs = new MutationObserver(syncTheme);
		obs.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});
		return () => obs.disconnect();
	});

	const status = $derived($page.status ?? 500);
	const message = $derived(
		($page.error?.message as string) || 'Something went wrong'
	);

	const isNotFound = $derived(status === 404);

	function goBack() {
		if (browser && history.length > 1) {
			history.back();
		} else {
			goto('/');
		}
	}
</script>

<div
	class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-16 text-center
		{isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}"
>
	<!-- Icon -->
	<div
		class="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl
			{isNotFound
				? isDarkMode
					? 'bg-red-500/10 text-red-400'
					: 'bg-red-50 text-red-500'
				: isDarkMode
					? 'bg-amber-500/10 text-amber-400'
					: 'bg-amber-50 text-amber-600'}"
	>
		{#if isNotFound}
			<BookX class="h-10 w-10" strokeWidth={1.5} />
		{:else}
			<AlertTriangle class="h-10 w-10" strokeWidth={1.5} />
		{/if}
	</div>

	<!-- Status -->
	<p
		class="mb-2 text-sm font-semibold tracking-widest uppercase
			{isNotFound
				? isDarkMode
					? 'text-red-400/80'
					: 'text-red-500'
				: isDarkMode
					? 'text-amber-400/80'
					: 'text-amber-600'}"
	>
		Error {status}
	</p>

	<!-- Message -->
	<h1
		class="mb-3 max-w-lg text-2xl font-semibold tracking-tight sm:text-3xl
			{isDarkMode ? 'text-white' : 'text-zinc-900'}"
	>
		{message}
	</h1>

	<!-- Hint -->
	<p
		class="mb-8 max-w-sm text-sm leading-relaxed
			{isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}"
	>
		{#if isNotFound}
			This page or chapter may have been removed, the URL is incorrect, or the source is currently unavailable.
		{:else}
			Something went wrong on the server. Try reloading the page or come back later.
		{/if}
	</p>

	<!-- Actions -->
	<div class="flex flex-wrap items-center justify-center gap-3">
		<button
			onclick={goBack}
			class="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition
				{isDarkMode
					? 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
					: 'border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50'}"
		>
			<ArrowLeft class="h-4 w-4" />
			Go Back
		</button>

		<a
			href="/"
			class="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
		>
			<Home class="h-4 w-4" />
			Home
		</a>
	</div>
</div>
